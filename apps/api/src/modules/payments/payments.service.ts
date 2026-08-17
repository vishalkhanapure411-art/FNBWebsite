import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StripeGateway } from './gateways/stripe.gateway';
import { PaymentGateway } from './gateways/payment-gateway.interface';
import { paymentConfig, PaymentConfig } from '../../config/payment.config';
import {
  ProcessPaymentDto,
  RefundPaymentDto,
  SplitPaymentDto,
  QueryPaymentsDto,
} from './dto';
import { Role, PaymentMethod, PaymentStatus, OrderStatus } from '@omniops/shared';
import { Prisma } from '@prisma/client';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; id: string };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly config: PaymentConfig;
  private readonly gateways: Map<string, PaymentGateway> = new Map();

  constructor(
    private prisma: PrismaService,
    private stripeGateway: StripeGateway,
  ) {
    this.config = paymentConfig();
    this.gateways.set('stripe', stripeGateway);
  }

  // ══════════════════════════════════════════════════
  // PROCESS PAYMENT
  // ══════════════════════════════════════════════════

  async processPayment(dto: ProcessPaymentDto, user: AuthUser) {
    // Verify order exists and is in CONFIRMED status
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { site: { select: { id: true, name: true, siteConfig: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PREPARING) {
      throw new BadRequestException(
        `Cannot process payment for order in ${order.status} status. Order must be CONFIRMED or PREPARING.`,
      );
    }

    // Check tenant scoping
    if (user.role !== Role.SUPER_ADMIN && user.tenantId && order.tenantId !== user.tenantId) {
      throw new NotFoundException('Order not found');
    }

    // Validate payment method is supported
    if (!this.config.supportedMethods.includes(dto.method)) {
      throw new BadRequestException(`Payment method ${dto.method} is not supported`);
    }

    // CASH: process internally
    if (dto.method === PaymentMethod.CASH) {
      return this.processCashPayment(order, user);
    }

    // Get the appropriate gateway
    const gatewayName = this.config.methodGatewayMap[dto.method];
    if (!gatewayName) {
      throw new BadRequestException(`No payment gateway configured for ${dto.method}`);
    }

    const gateway = this.gateways.get(gatewayName);
    if (!gateway) {
      throw new BadRequestException(`Payment gateway '${gatewayName}' not available`);
    }

    // Create payment record with PENDING status
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount: Number(order.grandTotal),
        method: dto.method,
        status: PaymentStatus.PENDING,
      },
    });

    // Get site-level currency config
    const siteConfig = (order.site.siteConfig as any) ?? {};
    const currency = siteConfig.currency ?? this.config.defaultCurrency;

    // Call gateway
    const result = await gateway.processPayment({
      amount: Number(order.grandTotal),
      currency,
      method: dto.method,
      orderId: order.id,
      gatewayData: dto.gatewayData ?? {},
      metadata: {
        siteId: order.siteId,
        orderNumber: String(order.orderNumber),
      },
    });

    if (result.success) {
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: result.status,
          gatewayTransactionId: result.transactionId ?? undefined,
          gatewayResponse: (result.response ?? undefined) as any,
        },
      });

      return {
        success: true,
        data: updatedPayment,
        message: 'Payment processed successfully',
      };
    } else {
      const failedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: { error: result.error, raw: result.response } as any,
        },
      });

      return {
        success: false,
        data: failedPayment,
        message: result.error ?? 'Payment failed',
      };
    }
  }

  // ══════════════════════════════════════════════════
  // CASH PAYMENT
  // ══════════════════════════════════════════════════

  private async processCashPayment(order: any, user: AuthUser) {
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount: Number(order.grandTotal),
        method: PaymentMethod.CASH,
        status: PaymentStatus.CAPTURED,
        gatewayResponse: {
          processedBy: user.id,
          method: 'CASH',
          note: 'Cash payment recorded directly — affects shift cash drawer',
        } as any,
      },
    });

    // TODO: Update active shift cash drawer tracking when shift module supports it
    this.logger.log(`Cash payment recorded for order ${order.id}, amount: ${order.grandTotal}`);

    return {
      success: true,
      data: payment,
      message: 'Cash payment recorded',
    };
  }

  // ══════════════════════════════════════════════════
  // REFUND PAYMENT
  // ══════════════════════════════════════════════════

  async refundPayment(paymentId: string, dto: RefundPaymentDto, user: AuthUser) {
    // Check user has manager-level role
    const managerRoles = [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD];
    if (!managerRoles.includes(user.role)) {
      throw new BadRequestException('Refunds require manager approval (Site Lead or above)');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException(
        `Cannot refund payment in ${payment.status} status. Payment must be CAPTURED.`,
      );
    }

    if (dto.amount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    // If it's CASH, handle internally
    if (payment.method === PaymentMethod.CASH) {
      return this.processCashRefund(payment, dto, user);
    }

    // Get gateway for this payment method
    const gatewayName = this.config.methodGatewayMap[payment.method];
    const gateway = gatewayName ? this.gateways.get(gatewayName) : null;

    if (!gateway || !payment.gatewayTransactionId) {
      throw new BadRequestException('Cannot refund — no gateway transaction available');
    }

    const result = await gateway.refundPayment(
      payment.gatewayTransactionId,
      dto.amount,
      dto.reason,
    );

    const isPartialRefund = dto.amount < Number(payment.amount);

    if (result.success) {
      if (isPartialRefund) {
        // Mark original as partially refunded, create refund record
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PARTIALLY_REFUNDED },
        });

        const refundPayment = await this.prisma.payment.create({
          data: {
            orderId: payment.orderId,
            amount: dto.amount,
            method: payment.method,
            status: PaymentStatus.REFUNDED,
            gatewayTransactionId: result.refundTransactionId ?? undefined,
            gatewayResponse: (result.response ?? undefined) as any,
            refundReason: dto.reason,
            refundApprovedBy: user.id,
          },
        });

        return {
          success: true,
          data: { original: payment, refund: refundPayment },
          message: 'Partial refund processed',
        };
      } else {
        // Full refund
        const updated = await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            gatewayResponse: (result.response ?? undefined) as any,
            refundReason: dto.reason,
            refundApprovedBy: user.id,
          },
        });

        return {
          success: true,
          data: updated,
          message: 'Full refund processed',
        };
      }
    } else {
      return {
        success: false,
        data: payment,
        message: result.error ?? 'Refund failed',
      };
    }
  }

  private async processCashRefund(payment: any, dto: RefundPaymentDto, user: AuthUser) {
    const isPartial = dto.amount < Number(payment.amount);

    if (isPartial) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PARTIALLY_REFUNDED },
      });

      const refundRecord = await this.prisma.payment.create({
        data: {
          orderId: payment.orderId,
          amount: dto.amount,
          method: PaymentMethod.CASH,
          status: PaymentStatus.REFUNDED,
          refundReason: dto.reason,
          refundApprovedBy: user.id,
          gatewayResponse: { method: 'CASH', note: 'Cash refund from drawer' } as any,
        },
      });

      return {
        success: true,
        data: { original: payment, refund: refundRecord },
        message: 'Partial cash refund recorded',
      };
    } else {
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundReason: dto.reason,
          refundApprovedBy: user.id,
        },
      });

      return {
        success: true,
        data: updated,
        message: 'Full cash refund recorded',
      };
    }
  }

  // ══════════════════════════════════════════════════
  // VOID PAYMENT
  // ══════════════════════════════════════════════════

  async voidPayment(paymentId: string, user: AuthUser) {
    const managerRoles = [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD];
    if (!managerRoles.includes(user.role)) {
      throw new BadRequestException('Void requires manager approval (Site Lead or above)');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== PaymentStatus.AUTHORIZED) {
      throw new BadRequestException(
        `Cannot void payment in ${payment.status} status. Only AUTHORIZED payments can be voided (before capture).`,
      );
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.VOIDED },
    });

    return {
      success: true,
      data: updated,
      message: 'Payment voided',
    };
  }

  // ══════════════════════════════════════════════════
  // SPLIT PAYMENT
  // ══════════════════════════════════════════════════

  async splitPayment(dto: SplitPaymentDto, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Validate total
    const splitTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    const orderTotal = Number(order.grandTotal);

    if (Math.abs(splitTotal - orderTotal) > 0.01) {
      throw new BadRequestException(
        `Split payments total (${splitTotal.toFixed(2)}) does not equal order total (${orderTotal.toFixed(2)})`,
      );
    }

    const results: any[] = [];

    for (const splitPayment of dto.payments) {
      const result = await this.processPayment(
        {
          orderId: dto.orderId,
          method: splitPayment.method,
          gatewayData: splitPayment.gatewayData,
        },
        user,
      );
      results.push({ method: splitPayment.method, amount: splitPayment.amount, result });
    }

    return {
      success: true,
      data: results,
      message: `Split payment: ${dto.payments.length} payments processed`,
    };
  }

  // ══════════════════════════════════════════════════
  // QUERY PAYMENTS
  // ══════════════════════════════════════════════════

  async findAll(query: QueryPaymentsDto, user: AuthUser) {
    const where: Prisma.PaymentWhereInput = {};
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    if (query.orderId) where.orderId = query.orderId;
    if (query.method) where.method = query.method;
    if (query.status) where.status = query.status as any;

    if (query.siteId) {
      where.order = { siteId: query.siteId };
    } else if (user.role !== Role.SUPER_ADMIN && user.tenantId) {
      where.order = { tenantId: user.tenantId };
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) (where.createdAt as any).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.createdAt as any).lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              grandTotal: true,
              site: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, user: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            grandTotal: true,
            subTotal: true,
            taxTotal: true,
            discountTotal: true,
            status: true,
            orderType: true,
            site: { select: { id: true, name: true, slug: true } },
            items: {
              select: { id: true, name: true, quantity: true, unitPrice: true, totalPrice: true },
            },
          },
        },
        refundApprover: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    return { success: true, data: payment };
  }

  async findByOrder(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: payments };
  }
}
