import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';
import {
  SalesSummaryQueryDto,
  SalesRealtimeQueryDto,
  MenuPerformanceQueryDto,
  CostsQueryDto,
  ReportExportQueryDto,
  BenchmarkingQueryDto,
  AnalyticsGroupBy,
  MenuSortBy,
  ReportType,
} from './dto/analytics-query.dto';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; id: string };

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════
  // SALES SUMMARY
  // ══════════════════════════════════════════════════

  async getSalesSummary(query: SalesSummaryQueryDto, user: AuthUser) {
    const { siteId, startDate, endDate, groupBy = AnalyticsGroupBy.DAY } = query;

    const site = await this.resolveSite(siteId, user);

    const dateFilter = this.buildDateFilter(startDate, endDate);
    const where: Prisma.OrderWhereInput = {
      siteId: site.id,
      tenantId: site.tenantId,
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
      ...dateFilter,
    };

    // Aggregate totals
    const [aggregation, ordersByChannel, ordersByType] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _count: { id: true },
        _sum: { grandTotal: true, discountTotal: true, subTotal: true },
      }),
      this.getOrdersByChannel(where),
      this.getOrdersByType(where),
    ]);

    const totalOrders = aggregation._count.id;
    const totalRevenue = Number(aggregation._sum.grandTotal ?? 0);
    const totalDiscounts = Number(aggregation._sum.discountTotal ?? 0);
    const netRevenue = totalRevenue - totalDiscounts;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Time-series breakdown
    const ordersByPeriod = await this.getOrdersByPeriod(site.tenantId, site.id, groupBy, startDate, endDate);

    return {
      success: true,
      data: {
        totalOrders,
        totalRevenue: this.round(totalRevenue),
        averageOrderValue: this.round(averageOrderValue),
        totalDiscounts: this.round(totalDiscounts),
        netRevenue: this.round(netRevenue),
        ordersByPeriod,
        ordersByChannel,
        ordersByType,
      },
    };
  }

  // ══════════════════════════════════════════════════
  // REALTIME
  // ══════════════════════════════════════════════════

  async getRealtime(query: SalesRealtimeQueryDto, user: AuthUser) {
    const site = await this.resolveSite(query.siteId, user);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();
    const endOfDay = new Date(todayStart);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const where: Prisma.OrderWhereInput = {
      siteId: site.id,
      tenantId: site.tenantId,
      createdAt: { gte: todayStart, lt: endOfDay },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    };

    const [aggregation, activeOrdersCount] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _count: { id: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.count({
        where: {
          siteId: site.id,
          status: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
        },
      }),
    ]);

    const todayOrders = aggregation._count.id;
    const todayRevenue = Number(aggregation._sum.grandTotal ?? 0);
    const averageOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;

    // Hourly breakdown
    const hourlyBreakdown = await this.getHourlyBreakdown(site.tenantId, site.id, todayStart, endOfDay);

    return {
      success: true,
      data: {
        todayOrders,
        todayRevenue: this.round(todayRevenue),
        activeOrders: activeOrdersCount,
        averageOrderValue: this.round(averageOrderValue),
        hourlyBreakdown,
        lastUpdated: now.toISOString(),
      },
    };
  }

  // ══════════════════════════════════════════════════
  // MENU PERFORMANCE
  // ══════════════════════════════════════════════════

  async getMenuPerformance(query: MenuPerformanceQueryDto, user: AuthUser) {
    const site = await this.resolveSite(query.siteId, user);
    const { limit = 20, sortBy = MenuSortBy.REVENUE } = query;

    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    // Get order items for this site's orders within date range
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          siteId: site.id,
          tenantId: site.tenantId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          ...dateFilter,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            costPrice: true,
            category: { select: { name: true } },
            station: true,
          },
        },
      },
    });

    // Aggregate by menuItem
    const itemMap = new Map<string, {
      menuItemId: string;
      name: string;
      category: string;
      station: string;
      quantity: number;
      revenue: number;
      cost: number;
    }>();

    for (const oi of orderItems) {
      const mi = oi.menuItem;
      const costPrice = Number(mi.costPrice ?? 0);
      const totalPrice = Number(oi.totalPrice);

      const existing = itemMap.get(mi.id);
      if (existing) {
        existing.quantity += oi.quantity;
        existing.revenue += totalPrice;
        existing.cost += costPrice * oi.quantity;
      } else {
        itemMap.set(mi.id, {
          menuItemId: mi.id,
          name: mi.name,
          category: mi.category?.name ?? 'Uncategorized',
          station: mi.station,
          quantity: oi.quantity,
          revenue: totalPrice,
          cost: costPrice * oi.quantity,
        });
      }
    }

    const allItems = Array.from(itemMap.values()).map((item) => ({
      ...item,
      margin: this.round(item.revenue - item.cost),
      marginPercent: item.revenue > 0 ? this.round(((item.revenue - item.cost) / item.revenue) * 100) : 0,
    }));

    // Sort
    const sortFn = (a: any, b: any) => {
      if (sortBy === MenuSortBy.REVENUE) return b.revenue - a.revenue;
      if (sortBy === MenuSortBy.QUANTITY) return b.quantity - a.quantity;
      return b.margin - a.margin;
    };

    const sorted = [...allItems].sort(sortFn);
    const topSellers = sorted.slice(0, limit);
    const worstSellers = sorted.slice(-limit).reverse();

    // By category
    const categoryMap = new Map<string, { quantity: number; revenue: number; margin: number }>();
    for (const item of allItems) {
      const cat = item.category;
      const existing = categoryMap.get(cat);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.revenue;
        existing.margin += item.margin;
      } else {
        categoryMap.set(cat, { quantity: item.quantity, revenue: item.revenue, margin: item.margin });
      }
    }

    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      quantity: data.quantity,
      revenue: this.round(data.revenue),
      margin: this.round(data.margin),
    }));

    // By station
    const stationMap = new Map<string, { quantity: number; totalItems: number }>();
    for (const oi of orderItems) {
      const station = oi.station;
      const existing = stationMap.get(station);
      if (existing) {
        existing.quantity += oi.quantity;
        existing.totalItems += 1;
      } else {
        stationMap.set(station, { quantity: oi.quantity, totalItems: 1 });
      }
    }

    const byStation = Array.from(stationMap.entries()).map(([station, data]) => ({
      station,
      quantity: data.quantity,
      avgPrepTime: 0, // prep time tracking not yet available
    }));

    return {
      success: true,
      data: {
        topSellers: topSellers.map((i) => ({ ...i, revenue: this.round(i.revenue), cost: this.round(i.cost) })),
        worstSellers: worstSellers.map((i) => ({ ...i, revenue: this.round(i.revenue), cost: this.round(i.cost) })),
        byCategory,
        byStation,
      },
    };
  }

  // ══════════════════════════════════════════════════
  // COSTS
  // ══════════════════════════════════════════════════

  async getCosts(query: CostsQueryDto, user: AuthUser) {
    const site = await this.resolveSite(query.siteId, user);
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const where: Prisma.OrderWhereInput = {
      siteId: site.id,
      tenantId: site.tenantId,
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
      ...dateFilter,
    };

    // Get revenue
    const revenueAgg = await this.prisma.order.aggregate({
      where,
      _sum: { grandTotal: true },
    });
    const revenueTotal = Number(revenueAgg._sum.grandTotal ?? 0);

    // Get food cost from order items
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          siteId: site.id,
          tenantId: site.tenantId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          ...dateFilter,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        menuItem: { select: { costPrice: true } },
      },
    });

    let foodCostTotal = 0;
    for (const oi of orderItems) {
      const costPrice = Number(oi.menuItem?.costPrice ?? 0);
      foodCostTotal += costPrice * oi.quantity;
    }

    const foodCostPercent = revenueTotal > 0 ? (foodCostTotal / revenueTotal) * 100 : 0;

    // Labor cost estimate: count closed shifts in period
    const shiftWhere: any = { siteId: site.id, status: 'CLOSED' };
    if (query.startDate || query.endDate) {
      shiftWhere.startTime = {};
      if (query.startDate) shiftWhere.startTime.gte = new Date(query.startDate);
      if (query.endDate) shiftWhere.startTime.lte = new Date(query.endDate);
    }
    const shifts = await this.prisma.shift.count({ where: shiftWhere });

    // Simplified labor: assume ~$150 per shift per staff (MVP approximation)
    const laborCostTotal = shifts * 150;
    const laborCostPercent = revenueTotal > 0 ? (laborCostTotal / revenueTotal) * 100 : 0;

    return {
      success: true,
      data: {
        foodCostPercent: this.round(foodCostPercent),
        foodCostTotal: this.round(foodCostTotal),
        revenueTotal: this.round(revenueTotal),
        laborCostPercent: this.round(laborCostPercent),
        laborCostTotal: this.round(laborCostTotal),
      },
    };
  }

  // ══════════════════════════════════════════════════
  // REPORT EXPORT
  // ══════════════════════════════════════════════════

  async exportReport(query: ReportExportQueryDto, user: AuthUser) {
    const site = await this.resolveSite(query.siteId, user);
    const { reportType = ReportType.SALES, format = 'csv' } = query;
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    if (reportType === ReportType.SALES) {
      return this.exportSalesReport(site, dateFilter, format);
    } else if (reportType === ReportType.MENU) {
      return this.exportMenuReport(site, dateFilter, format);
    } else {
      return this.exportCostsReport(site, dateFilter, format);
    }
  }

  private async exportSalesReport(
    site: { id: string; tenantId: string; name: string },
    dateFilter: any,
    format: string,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        siteId: site.id,
        tenantId: site.tenantId,
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        ...dateFilter,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      channel: o.channel,
      status: o.status,
      subTotal: Number(o.subTotal),
      taxTotal: Number(o.taxTotal),
      discountTotal: Number(o.discountTotal),
      grandTotal: Number(o.grandTotal),
      createdAt: o.createdAt.toISOString(),
    }));

    if (format === 'json') {
      return { data: rows, format: 'json', filename: `sales-${site.name}-${new Date().toISOString().split('T')[0]}.json` };
    }

    // CSV
    const headers = ['Order #', 'Type', 'Channel', 'Status', 'Subtotal', 'Tax', 'Discount', 'Grand Total', 'Date'];
    const csvRows = rows.map((r) =>
      [r.orderNumber, r.orderType, r.channel, r.status, r.subTotal, r.taxTotal, r.discountTotal, r.grandTotal, r.createdAt].join(','),
    );
    const csv = [headers.join(','), ...csvRows].join('\n');

    return { data: csv, format: 'csv', filename: `sales-${site.name}-${new Date().toISOString().split('T')[0]}.csv` };
  }

  private async exportMenuReport(
    site: { id: string; tenantId: string; name: string },
    dateFilter: any,
    format: string,
  ) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          siteId: site.id,
          tenantId: site.tenantId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          ...dateFilter,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        menuItem: { select: { id: true, name: true, costPrice: true, category: { select: { name: true } } } },
      },
    });

    const itemMap = new Map<string, any>();
    for (const oi of orderItems) {
      const mi = oi.menuItem;
      const costPrice = Number(mi.costPrice ?? 0);
      const existing = itemMap.get(mi.id);
      if (existing) {
        existing.quantity += oi.quantity;
        existing.revenue += Number(oi.totalPrice);
        existing.cost += costPrice * oi.quantity;
      } else {
        itemMap.set(mi.id, {
          name: mi.name,
          category: mi.category?.name ?? '',
          quantity: oi.quantity,
          revenue: Number(oi.totalPrice),
          cost: costPrice * oi.quantity,
        });
      }
    }

    const rows = Array.from(itemMap.values()).map((item) => ({
      ...item,
      margin: this.round(item.revenue - item.cost),
      marginPercent: item.revenue > 0 ? this.round(((item.revenue - item.cost) / item.revenue) * 100) : 0,
    }));

    if (format === 'json') {
      return { data: rows, format: 'json', filename: `menu-${site.name}-${new Date().toISOString().split('T')[0]}.json` };
    }

    const headers = ['Item', 'Category', 'Qty Sold', 'Revenue', 'Cost', 'Margin', 'Margin %'];
    const csvRows = rows.map((r) =>
      [r.name, r.category, r.quantity, r.revenue, r.cost, r.margin, `${r.marginPercent}%`].join(','),
    );
    const csv = [headers.join(','), ...csvRows].join('\n');

    return { data: csv, format: 'csv', filename: `menu-${site.name}-${new Date().toISOString().split('T')[0]}.csv` };
  }

  private async exportCostsReport(
    site: { id: string; tenantId: string; name: string },
    dateFilter: any,
    format: string,
  ) {
    const costsData = await this.getCosts(
      { siteId: site.id, startDate: dateFilter?.createdAt?.gte?.toISOString(), endDate: dateFilter?.createdAt?.lte?.toISOString() },
      { tenantId: site.tenantId, role: Role.SUPER_ADMIN, id: 'system', siteId: site.id },
    );

    const row = costsData.data;
    if (format === 'json') {
      return { data: row, format: 'json', filename: `costs-${site.name}-${new Date().toISOString().split('T')[0]}.json` };
    }

    const csv = [
      'Metric,Value',
      `Food Cost %,${row.foodCostPercent}`,
      `Food Cost Total,${row.foodCostTotal}`,
      `Revenue Total,${row.revenueTotal}`,
      `Labor Cost %,${row.laborCostPercent}`,
      `Labor Cost Total,${row.laborCostTotal}`,
    ].join('\n');

    return { data: csv, format: 'csv', filename: `costs-${site.name}-${new Date().toISOString().split('T')[0]}.csv` };
  }

  // ══════════════════════════════════════════════════
  // BENCHMARKING
  // ══════════════════════════════════════════════════

  async getBenchmarking(query: BenchmarkingQueryDto, user: AuthUser) {
    let tenantId = query.tenantId;

    if (!tenantId) {
      if (user.role === Role.SUPER_ADMIN) {
        throw new BadRequestException('tenantId is required for SUPER_ADMIN');
      }
      if (!user.tenantId) {
        throw new BadRequestException('Unable to determine tenant');
      }
      tenantId = user.tenantId;
    }

    // Only SUPER_ADMIN and BRAND_MANAGER can access benchmarking
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.BRAND_MANAGER) {
      throw new BadRequestException('Insufficient permissions');
    }

    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    const sites = await this.prisma.site.findMany({
      where: { tenantId, status: { not: 'CLOSED' } },
      select: { id: true, name: true, slug: true },
    });

    const results = await Promise.all(
      sites.map(async (site) => {
        const where: Prisma.OrderWhereInput = {
          siteId: site.id,
          tenantId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          ...dateFilter,
        };

        const [orderAgg, orderItems] = await Promise.all([
          this.prisma.order.aggregate({
            where,
            _count: { id: true },
            _sum: { grandTotal: true },
          }),
          this.prisma.orderItem.findMany({
            where: {
              order: {
                siteId: site.id,
                tenantId,
                status: { notIn: ['CANCELLED', 'REFUNDED'] },
                ...dateFilter,
              },
              status: { not: 'CANCELLED' },
            },
            include: {
              menuItem: { select: { costPrice: true } },
            },
          }),
        ]);

        const orders = orderAgg._count.id;
        const revenue = Number(orderAgg._sum.grandTotal ?? 0);
        const aov = orders > 0 ? revenue / orders : 0;

        let foodCostTotal = 0;
        for (const oi of orderItems) {
          foodCostTotal += Number(oi.menuItem?.costPrice ?? 0) * oi.quantity;
        }
        const foodCost = revenue > 0 ? (foodCostTotal / revenue) * 100 : 0;

        return {
          siteId: site.id,
          name: site.name,
          orders,
          revenue: this.round(revenue),
          aov: this.round(aov),
          foodCost: this.round(foodCost),
        };
      }),
    );

    return {
      success: true,
      data: { sites: results },
    };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

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

  private buildDateFilter(startDate?: string, endDate?: string): Partial<Prisma.OrderWhereInput> {
    const createdAt: any = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate);
    return Object.keys(createdAt).length > 0 ? { createdAt } : {};
  }

  private async getOrdersByChannel(where: Prisma.OrderWhereInput) {
    const orders = await this.prisma.order.groupBy({
      by: ['channel'],
      where,
      _count: { id: true },
      _sum: { grandTotal: true },
    });

    return orders.map((o) => ({
      channel: o.channel,
      orders: o._count.id,
      revenue: this.round(Number(o._sum.grandTotal ?? 0)),
    }));
  }

  private async getOrdersByType(where: Prisma.OrderWhereInput) {
    const orders = await this.prisma.order.groupBy({
      by: ['orderType'],
      where,
      _count: { id: true },
      _sum: { grandTotal: true },
    });

    return orders.map((o) => ({
      type: o.orderType,
      orders: o._count.id,
      revenue: this.round(Number(o._sum.grandTotal ?? 0)),
    }));
  }

  private async getOrdersByPeriod(
    tenantId: string,
    siteId: string,
    groupBy: AnalyticsGroupBy,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const orders = await this.prisma.order.findMany({
      where: {
        siteId,
        tenantId,
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        ...dateFilter,
      },
      select: {
        createdAt: true,
        grandTotal: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group manually by period
    const periodMap = new Map<string, { orders: number; revenue: number }>();

    for (const o of orders) {
      const key = this.getPeriodKey(o.createdAt, groupBy);
      const existing = periodMap.get(key);
      if (existing) {
        existing.orders += 1;
        existing.revenue += Number(o.grandTotal);
      } else {
        periodMap.set(key, { orders: 1, revenue: Number(o.grandTotal) });
      }
    }

    return Array.from(periodMap.entries()).map(([period, data]) => ({
      period,
      orders: data.orders,
      revenue: this.round(data.revenue),
    }));
  }

  private getPeriodKey(date: Date, groupBy: AnalyticsGroupBy): string {
    const d = new Date(date);
    switch (groupBy) {
      case AnalyticsGroupBy.HOUR:
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())} ${this.pad(d.getHours())}:00`;
      case AnalyticsGroupBy.DAY:
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
      case AnalyticsGroupBy.WEEK: {
        // ISO week
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${d.getUTCFullYear()}-W${this.pad(weekNo)}`;
      }
      case AnalyticsGroupBy.MONTH:
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}`;
      default:
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
    }
  }

  private async getHourlyBreakdown(tenantId: string, siteId: string, todayStart: Date, endOfDay: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        siteId,
        tenantId,
        createdAt: { gte: todayStart, lt: endOfDay },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      select: { createdAt: true, grandTotal: true },
    });

    const hourMap = new Map<number, { orders: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { orders: 0, revenue: 0 });
    }

    for (const o of orders) {
      const hour = new Date(o.createdAt).getHours();
      const entry = hourMap.get(hour);
      if (entry) {
        entry.orders += 1;
        entry.revenue += Number(o.grandTotal);
      }
    }

    return Array.from(hourMap.entries())
      .filter(([, data]) => data.orders > 0)
      .map(([hour, data]) => ({
        hour,
        orders: data.orders,
        revenue: this.round(data.revenue),
      }));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
}
