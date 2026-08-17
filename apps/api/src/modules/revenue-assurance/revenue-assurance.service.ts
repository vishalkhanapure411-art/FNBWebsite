import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@omniops/shared';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import {
  RevenueAssuranceQueryDto,
  AnomalyListQueryDto,
  AnomalyCategory,
  AnomalySeverity,
} from './dto/revenue-assurance-query.dto';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; id: string };

export interface DetectedAnomaly {
  id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  siteId: string;
  orderId: string;
  orderNumber: number;
  reference: string;
  description: string;
  amount: number;
  detectedAt: string;
}

// ─── Rule thresholds (documented in the module README) ───
const VOID_SPIKE_MIN_COUNT = 3; // >= 3 voided/refunded orders in a day
const VOID_SPIKE_MIN_RATIO = 0.2; // or void/refund value > 20% of that day's total order value
const VOID_SPIKE_HIGH_RATIO = 0.3;
const VOID_SPIKE_HIGH_VALUE = 200;
const DISCOUNT_OUTLIER_RATIO = 0.3; // discount > 30% of subtotal
const DISCOUNT_HIGH_RATIO = 0.5; // discount > 50% of subtotal (or fully comped)
const MISMATCH_TOLERANCE = 0.01; // $0.01 tolerance between payments and grand total
const MISMATCH_HIGH_DIFF = 50;
const MISMATCH_HIGH_RATIO = 0.1;
const MISSING_PAYMENT_HIGH = 100; // grand total >= $100 → HIGH
const MISSING_PAYMENT_MEDIUM = 30;

// Statuses where an order is expected to be paid for (money movement applies)
const EXPECTED_PAID_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
  OrderStatus.COMPLETED,
] as const;

// Payment statuses that count as "money applied toward the total"
const APPLIED_PAYMENT_STATUSES = [
  PaymentStatus.PENDING,
  PaymentStatus.AUTHORIZED,
  PaymentStatus.CAPTURED,
  PaymentStatus.PARTIALLY_REFUNDED,
] as const;

// Voided or refunded payment statuses (revenue already walked back)
const VOID_OR_REFUNDED_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.VOIDED,
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
];

// Refunded payment statuses
const REFUNDED_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
];

const ORDER_WITH_ORDER_NUMBER = {
  orderBy: { createdAt: 'desc' as const },
  include: {
    payments: true,
    discounts: true,
    _count: { select: { items: true } },
  },
};

@Injectable()
export class RevenueAssuranceService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════

  async getSummary(query: RevenueAssuranceQueryDto, user: AuthUser) {
    const { site, from, to } = await this.resolveWindow(query, user);

    const [orders, anomalies] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          siteId: site.id,
          tenantId: site.tenantId,
          createdAt: { gte: from, lt: to },
          status: { not: OrderStatus.DRAFT },
        },
        ...ORDER_WITH_ORDER_NUMBER,
      }),
      this.detect(site, from, to),
    ]);

    const realizedOrders = orders.filter(
      (o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REFUNDED,
    );
    const totalOrders = orders.length;
    const totalRevenue = this.round(
      realizedOrders.reduce((s, o) => s + Number(o.grandTotal), 0),
    );
    const anomalyCount = anomalies.length;
    const anomalyValue = this.round(anomalies.reduce((s, a) => s + a.amount, 0));
    const riskScore = this.computeRiskScore(anomalyValue, totalRevenue, anomalyCount);

    const byCategory = this.groupByCategory(anomalies);

    return {
      success: true,
      data: {
        siteId: site.id,
        from: from.toISOString(),
        to: to.toISOString(),
        totalOrders,
        totalRevenue,
        anomalyCount,
        anomalyValue,
        riskScore,
        byCategory,
      },
    };
  }

  // ══════════════════════════════════════════════════
  // ANOMALY LIST (paged)
  // ══════════════════════════════════════════════════

  async getAnomalies(query: AnomalyListQueryDto, user: AuthUser) {
    const { site, from, to } = await this.resolveWindow(query, user);
    const { category, severity, page = 1, limit = 50 } = query;

    const anomalies = await this.detect(site, from, to);

    let filtered = anomalies;
    if (category) filtered = filtered.filter((a) => a.category === category);
    if (severity) filtered = filtered.filter((a) => a.severity === severity);

    filtered.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      success: true,
      data,
      meta: { page, limit, total },
    };
  }

  // ══════════════════════════════════════════════════
  // DETECTION ENGINE
  // ══════════════════════════════════════════════════

  async detect(
    site: { id: string; tenantId: string },
    from: Date,
    to: Date,
  ): Promise<DetectedAnomaly[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        siteId: site.id,
        tenantId: site.tenantId,
        createdAt: { gte: from, lt: to },
        status: { not: OrderStatus.DRAFT },
      },
      include: {
        payments: true,
        discounts: true,
        _count: { select: { items: true } },
      },
    });

    const anomalies: DetectedAnomaly[] = [];
    for (const order of orders) {
      this.checkMissingPayment(order, anomalies);
      this.checkDiscountOutlier(order, anomalies);
      this.checkPaymentMismatch(order, anomalies);
      this.checkNoSale(order, anomalies);
    }
    this.checkVoidRefundSpike(orders, anomalies);

    return anomalies;
  }

  // ─── Rule 1: order without payment ───
  private checkMissingPayment(
    order: Prisma.OrderGetPayload<typeof ORDER_WITH_ORDER_NUMBER>,
    anomalies: DetectedAnomaly[],
  ) {
    if (!EXPECTED_PAID_STATUSES.includes(order.status as (typeof EXPECTED_PAID_STATUSES)[number])) {
      return;
    }
    const grandTotal = Number(order.grandTotal);
    const applied = order.payments.filter((p) => p.status !== PaymentStatus.FAILED);
    if (grandTotal <= 0 || applied.length > 0) {
      return;
    }
    const severity =
      grandTotal >= MISSING_PAYMENT_HIGH
        ? AnomalySeverity.HIGH
        : grandTotal >= MISSING_PAYMENT_MEDIUM
          ? AnomalySeverity.MEDIUM
          : AnomalySeverity.LOW;
    anomalies.push(
      this.buildAnomaly(order, AnomalyCategory.MISSING_PAYMENT, severity, grandTotal,
        `Order #${order.orderNumber} is ${order.status} ($${grandTotal.toFixed(2)}) with no payment record`),
    );
  }

  // ─── Rule 2: void/refund spike (per site/day) ───
  private checkVoidRefundSpike(
    orders: Prisma.OrderGetPayload<typeof ORDER_WITH_ORDER_NUMBER>[],
    anomalies: DetectedAnomaly[],
  ) {
    // Group orders by UTC day
    const byDay = new Map<string, Prisma.OrderGetPayload<typeof ORDER_WITH_ORDER_NUMBER>[]>();
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(order);
      byDay.set(day, list);
    }

    for (const [day, dayOrders] of byDay) {
      const voided = dayOrders.filter(
        (o) =>
          o.status === OrderStatus.CANCELLED ||
          o.status === OrderStatus.REFUNDED ||
          o.payments.some((p) => VOID_OR_REFUNDED_PAYMENT_STATUSES.includes(p.status)),
      );
      if (voided.length === 0) continue;

      const voidValue = this.round(voided.reduce((s, o) => s + Number(o.grandTotal), 0));
      const dayTotalValue = this.round(dayOrders.reduce((s, o) => s + Number(o.grandTotal), 0));
      const ratio = dayTotalValue > 0 ? voidValue / dayTotalValue : 1;

      if (voided.length < VOID_SPIKE_MIN_COUNT && ratio <= VOID_SPIKE_MIN_RATIO) {
        continue; // no spike
      }

      const severity =
        voidValue > VOID_SPIKE_HIGH_VALUE || ratio > VOID_SPIKE_HIGH_RATIO
          ? AnomalySeverity.HIGH
          : AnomalySeverity.MEDIUM;

      for (const order of voided) {
        const amount = Number(order.grandTotal);
        const refunded = order.payments.some((p) => REFUNDED_PAYMENT_STATUSES.includes(p.status));
        anomalies.push(
          this.buildAnomaly(order, AnomalyCategory.VOID_REFUND_SPIKE, severity, amount,
            `${refunded ? 'Refunded' : 'Voided'} order #${order.orderNumber} ($${amount.toFixed(2)}) — ${voided.length} void/refund(s) on ${day} = $${voidValue.toFixed(2)} (${(ratio * 100).toFixed(1)}% of day value)`),
        );
      }
    }
  }

  // ─── Rule 3: discount outlier ───
  private checkDiscountOutlier(
    order: Prisma.OrderGetPayload<typeof ORDER_WITH_ORDER_NUMBER>,
    anomalies: DetectedAnomaly[],
  ) {
    if (order.status === OrderStatus.DRAFT) return;
    const subTotal = Number(order.subTotal);
    const discountTotal = Number(order.discountTotal);
    if (subTotal <= 0 || discountTotal <= 0) return;

    const ratio = discountTotal / subTotal;
    if (ratio <= DISCOUNT_OUTLIER_RATIO) return;

    const isComped = Number(order.grandTotal) <= 0;
    const severity =
      isComped || ratio > DISCOUNT_HIGH_RATIO ? AnomalySeverity.HIGH : AnomalySeverity.MEDIUM;
    anomalies.push(
      this.buildAnomaly(order, AnomalyCategory.DISCOUNT_OUTLIER, severity, discountTotal,
        `Order #${order.orderNumber} discount $${discountTotal.toFixed(2)} is ${(ratio * 100).toFixed(1)}% of subtotal $${subTotal.toFixed(2)}${isComped ? ' (fully comped)' : ''}`),
    );
  }

  // ─── Rule 4: payment mismatch ───
  private checkPaymentMismatch(
    order: Prisma.OrderGetPayload<typeof ORDER_WITH_ORDER_NUMBER>,
    anomalies: DetectedAnomaly[],
  ) {
    if (!EXPECTED_PAID_STATUSES.includes(order.status as (typeof EXPECTED_PAID_STATUSES)[number])) {
      return;
    }
    const applied = order.payments.filter((p) =>
      APPLIED_PAYMENT_STATUSES.includes(p.status as (typeof APPLIED_PAYMENT_STATUSES)[number]),
    );
    if (applied.length === 0) return; // covered by MISSING_PAYMENT

    const grandTotal = Number(order.grandTotal);
    const paid = this.round(applied.reduce((s, p) => s + Number(p.amount), 0));
    const diff = Math.abs(paid - grandTotal);
    if (diff <= MISMATCH_TOLERANCE) return;

    const ratio = grandTotal > 0 ? diff / grandTotal : 1;
    const severity =
      diff > MISMATCH_HIGH_DIFF || ratio > MISMATCH_HIGH_RATIO
        ? AnomalySeverity.HIGH
        : AnomalySeverity.MEDIUM;
    const direction = paid > grandTotal ? 'over' : 'under';
    anomalies.push(
      this.buildAnomaly(order, AnomalyCategory.PAYMENT_MISMATCH, severity, diff,
        `Order #${order.orderNumber} paid $${paid.toFixed(2)} but grand total is $${grandTotal.toFixed(2)} (${direction} by $${diff.toFixed(2)})`),
    );
  }

  // ─── Rule 5: no-sale / zero-value orders ───
  private checkNoSale(
    order: Prisma.OrderGetPayload<typeof ORDER_WITH_ORDER_NUMBER>,
    anomalies: DetectedAnomaly[],
  ) {
    if (!EXPECTED_PAID_STATUSES.includes(order.status as (typeof EXPECTED_PAID_STATUSES)[number])) {
      return;
    }
    const subTotal = Number(order.subTotal);
    if (subTotal !== 0 || order._count.items > 0) return;
    anomalies.push(
      this.buildAnomaly(order, AnomalyCategory.NO_SALE, AnomalySeverity.LOW, 0,
        `Order #${order.orderNumber} opened and closed (${order.status}) with no items — potential test/employee misuse`),
    );
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  private buildAnomaly(
    order: Prisma.OrderGetPayload<typeof ORDER_WITH_ORDER_NUMBER>,
    category: AnomalyCategory,
    severity: AnomalySeverity,
    amount: number,
    description: string,
  ): DetectedAnomaly {
    return {
      id: `anom-${category}-${order.id}`,
      category,
      severity,
      siteId: order.siteId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      reference: `Order #${order.orderNumber}`,
      description,
      amount: this.round(amount),
      detectedAt: order.createdAt.toISOString(),
    };
  }

  private groupByCategory(anomalies: DetectedAnomaly[]) {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    const map = new Map<string, { category: string; count: number; value: number; severity: AnomalySeverity }>();
    for (const a of anomalies) {
      const existing = map.get(a.category);
      if (existing) {
        existing.count += 1;
        existing.value = this.round(existing.value + a.amount);
        if (order[a.severity] < order[existing.severity]) {
          existing.severity = a.severity;
        }
      } else {
        map.set(a.category, { category: a.category, count: 1, value: this.round(a.amount), severity: a.severity });
      }
    }
    return Array.from(map.values()).sort((x, y) => y.value - x.value);
  }

  private computeRiskScore(anomalyValue: number, totalRevenue: number, anomalyCount: number): number {
    const revenue = Math.max(totalRevenue, 0.01);
    // 50 pts from anomaly value share of revenue, 3 pts per anomaly, capped at 100
    return Math.min(100, Math.round((anomalyValue / revenue) * 50 + anomalyCount * 3));
  }

  private async resolveWindow(query: RevenueAssuranceQueryDto, user: AuthUser) {
    const site = await this.resolveSite(query.siteId, user);
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (from >= to) {
      throw new BadRequestException('from must be before to');
    }
    return { site, from, to };
  }

  private async resolveSite(
    siteId: string | undefined,
    user: AuthUser,
  ): Promise<{ id: string; tenantId: string; name: string; slug?: string }> {
    if (!siteId && user.siteId) {
      siteId = user.siteId;
    }
    if (!siteId) {
      throw new BadRequestException('siteId is required');
    }
    const where: Prisma.SiteWhereInput = { id: siteId };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) {
      where.tenantId = user.tenantId;
    }
    const site = await this.prisma.site.findFirst({ where });
    if (!site) {
      throw new BadRequestException('Site not found');
    }
    return site;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
