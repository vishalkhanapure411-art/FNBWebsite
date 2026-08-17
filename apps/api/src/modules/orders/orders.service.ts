import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  ApplyDiscountDto,
  QueryOrdersDto,
  AddOrderItemDto,
} from './dto';
import { Role, OrderStatus } from '@omniops/shared';
import { Prisma } from '@prisma/client';
import { KitchenGateway } from '../../common/gateways/kitchen.gateway';
import { CdsGateway } from '../cds/cds.gateway';
import { PaymentsService } from '../payments/payments.service';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; id: string };

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => KitchenGateway))
    private kitchenGateway: KitchenGateway | null,
    @Optional() @Inject(forwardRef(() => CdsGateway))
    private cdsGateway: CdsGateway | null,
    private paymentsService: PaymentsService,
  ) {}

  // ══════════════════════════════════════════════════
  // ORDER CREATION
  // ══════════════════════════════════════════════════

  async create(dto: CreateOrderDto, user: AuthUser) {
    // Validate site exists and user has access
    const site = await this.findSiteForUser(dto.siteId, user);

    // Validate table if provided
    if (dto.tableId) {
      const table = await this.prisma.table.findFirst({
        where: { id: dto.tableId, siteId: site.id },
      });
      if (!table) throw new NotFoundException('Table not found');
    }

    // Look up all menu items and compute totals
    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('One or more menu items not found');
    }

    const menuItemMap = new Map(menuItems.map((mi: any) => [mi.id, mi]));
    const getMenuItem = (id: string): any => {
      const item = menuItemMap.get(id);
      if (!item) throw new BadRequestException(`Menu item ${id} not found`);
      return item;
    };

    let subTotal = 0;
    let taxTotal = 0;

    const now = new Date();
    const orderItemsData = dto.items.map((item) => {
      const menuItem = getMenuItem(item.menuItemId);
      if (menuItem.status === 'EIGHTY_SIX' || menuItem.status === 'DISCONTINUED') {
        throw new BadRequestException(`Menu item "${menuItem.name}" is currently unavailable`);
      }

      const unitPrice = Number(menuItem.price);
      const qty = item.quantity;
      let modifierAdjustment = 0;

      // Compute modifier price adjustments
      const modifiersData = (item.modifiers ?? []).map((mod) => {
        const adj = mod.priceAdjustment ?? 0;
        modifierAdjustment += adj;
        return {
          modifierName: mod.modifierName,
          priceAdjustment: adj,
        };
      });

      const effectiveUnitPrice = unitPrice + modifierAdjustment;
      const totalPrice = effectiveUnitPrice * qty;
      const itemTax = (totalPrice * Number(menuItem.taxRate)) / 100;

      subTotal += totalPrice;
      taxTotal += itemTax;

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: qty,
        unitPrice: effectiveUnitPrice,
        totalPrice,
        taxRate: Number(menuItem.taxRate),
        station: menuItem.station,
        status: 'PENDING' as const,
        notes: item.notes,
        firedAt: now,
        modifiers: {
          create: modifiersData,
        },
      };
    });

    // Generate order number (site-scoped sequence)
    const orderNumber = await this.getNextOrderNumber(site.id);

    const grandTotal = subTotal + taxTotal;

    const order = await this.prisma.order.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        userId: user.id,
        orderNumber,
        orderType: dto.orderType,
        channel: dto.channel ?? 'POS',
        status: 'CONFIRMED',
        subTotal,
        taxTotal,
        discountTotal: 0,
        grandTotal,
        tableId: dto.tableId ?? null,
        guestCount: dto.guestCount ?? 1,
        notes: dto.notes,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { modifiers: true },
        },
        table: {
          select: { id: true, number: true },
        },
      },
    });

    // If table is assigned, mark it as OCCUPIED
    if (dto.tableId) {
      await this.prisma.table.update({
        where: { id: dto.tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    const formattedOrderNumber = this.formatOrderNumber(site.slug, orderNumber);

    // Emit WebSocket event for kitchen display
    try {
      const nowMs = Date.now();
      this.kitchenGateway?.emitOrderNew(site.id, {
        orderId: order.id,
        orderNumber: formattedOrderNumber,
        orderType: order.orderType,
        tableNumber: order.table?.number ?? null,
        guestCount: order.guestCount,
        items: order.items.map((item: any) => ({
          orderId: order.id,
          orderNumber: formattedOrderNumber,
          orderType: order.orderType,
          tableNumber: order.table?.number ?? null,
          guestCount: order.guestCount,
          itemId: item.id,
          itemName: item.name,
          quantity: item.quantity,
          modifiers: item.modifiers.map((m: any) => m.modifierName),
          notes: item.notes,
          status: item.status,
          elapsedSeconds: Math.floor((nowMs - new Date(item.firedAt).getTime()) / 1000),
          priority: false,
          createdAt: item.firedAt.toISOString(),
        })),
      });
    } catch {
      // WebSocket failure should not break the HTTP response
    }

    // Format the order number string for display
    const orderResponse = {
      ...order,
      orderNumberDisplay: formattedOrderNumber,
    };

    // Process payment if payment info is included
    let paymentResult: any = null;
    if (dto.payment) {
      try {
        paymentResult = await this.paymentsService.processPayment(
          {
            orderId: order.id,
            method: dto.payment.method,
            gatewayData: dto.payment.gatewayData,
          },
          user,
        );
      } catch (err: any) {
        // Payment failure should not block order creation — order is already placed
        paymentResult = { success: false, message: err.message };
      }
    }

    return {
      success: true,
      data: orderResponse,
      payment: paymentResult,
    };
  }

  // ══════════════════════════════════════════════════
  // ORDER QUERIES
  // ══════════════════════════════════════════════════

  async findAll(query: QueryOrdersDto, user: AuthUser) {
    const where: Prisma.OrderWhereInput = {};
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    // Tenant/site scoping
    if (user.role !== Role.SUPER_ADMIN) {
      if (query.siteId) {
        where.siteId = query.siteId;
      }
      if (user.tenantId) {
        where.tenantId = user.tenantId;
      }
    } else {
      if (query.siteId) where.siteId = query.siteId;
    }

    if (query.status) where.status = query.status;
    if (query.orderType) where.orderType = query.orderType;

    // Date range filtering
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) (where.createdAt as any).gte = new Date(query.dateFrom);
      if (query.dateTo) (where.createdAt as any).lte = new Date(query.dateTo);
    }

    // Search by order number
    if (query.search) {
      const numSearch = parseInt(query.search, 10);
      if (!isNaN(numSearch)) {
        where.orderNumber = numSearch;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { items: true } },
          table: { select: { number: true } },
          site: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      success: true,
      data: data.map((o: any) => ({
        ...o,
        itemCount: o._count.items,
        _count: undefined,
        orderNumberDisplay: this.formatOrderNumber(o.site.slug, o.orderNumber),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, user: AuthUser) {
    const order = await this.prisma.order.findFirst({
      where: { id },
      include: {
        items: {
          include: { modifiers: true },
        },
        discounts: true,
        payments: true,
        table: { select: { id: true, number: true } },
        site: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Check tenant scoping
    if (user.role !== Role.SUPER_ADMIN && user.tenantId && order.tenantId !== user.tenantId) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      data: {
        ...order,
        orderNumberDisplay: this.formatOrderNumber(order.site.slug, order.orderNumber),
      },
    };
  }

  // ══════════════════════════════════════════════════
  // ORDER STATUS MANAGEMENT
  // ══════════════════════════════════════════════════

  async updateStatus(id: string, dto: UpdateOrderStatusDto, user: AuthUser) {
    const order = await this.findOrderOrThrow(id);

    // Validate transition
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['SERVED', 'CANCELLED'],
      SERVED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
      REFUNDED: [],
    };

    const allowed = allowedTransitions[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });

    // When marking as COMPLETED, free the table
    if (dto.status === 'COMPLETED' && order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'DIRTY' },
      });
    }

    // Emit WebSocket event
    try {
      this.kitchenGateway?.emitOrderUpdated(order.siteId, {
        orderId: order.id,
        status: dto.status,
        items: [],
      });
      // Also emit to CDS
      this.cdsGateway?.emitOrderUpdated(order.id, {
        orderId: order.id,
        status: dto.status,
      });
    } catch {
      // WebSocket failure should not break the HTTP response
    }

    return { success: true, data: updated };
  }

  // ══════════════════════════════════════════════════
  // ORDER ITEMS MANAGEMENT
  // ══════════════════════════════════════════════════

  async addItem(orderId: string, dto: AddOrderItemDto, user: AuthUser) {
    const order = await this.findOrderOrThrow(orderId);

    if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new BadRequestException('Cannot add items to a closed order');
    }

    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
    });
    if (!menuItem) throw new NotFoundException('Menu item not found');

    const unitPrice = Number(menuItem.price);
    const qty = dto.quantity;
    let modifierAdjustment = 0;

    const modifiersData = (dto.modifiers ?? []).map((mod) => {
      const adj = mod.priceAdjustment ?? 0;
      modifierAdjustment += adj;
      return {
        modifierName: mod.modifierName,
        priceAdjustment: adj,
      };
    });

    const effectiveUnitPrice = unitPrice + modifierAdjustment;
    const totalPrice = effectiveUnitPrice * qty;
    const itemTax = (totalPrice * Number(menuItem.taxRate)) / 100;

    const now = new Date();
    const [orderItem] = await Promise.all([
      this.prisma.orderItem.create({
        data: {
          orderId,
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: qty,
          unitPrice: effectiveUnitPrice,
          totalPrice,
          taxRate: Number(menuItem.taxRate),
          station: menuItem.station,
          status: 'PENDING',
          notes: dto.notes,
          firedAt: now,
          modifiers: {
            create: modifiersData,
          },
        },
        include: { modifiers: true },
      }),
    ]);

    // Recalculate order totals
    await this.recalculateOrderTotals(orderId);

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    // Emit WebSocket event
    try {
      if (updatedOrder) {
        this.kitchenGateway?.emitOrderUpdated(order.siteId, {
          orderId,
          status: updatedOrder.status,
          items: [{
            orderId,
            orderNumber: '', // will be filled by client side
            orderType: updatedOrder.orderType,
            tableNumber: null,
            guestCount: updatedOrder.guestCount,
            itemId: orderItem.id,
            itemName: orderItem.name,
            quantity: orderItem.quantity,
            modifiers: orderItem.modifiers.map((m: any) => m.modifierName),
            notes: orderItem.notes,
            status: orderItem.status,
            elapsedSeconds: 0,
            priority: false,
            createdAt: orderItem.firedAt!.toISOString(),
          }],
        });
      }
    } catch {
      // WebSocket failure should not break the HTTP response
    }

    return { success: true, data: { item: orderItem, order: updatedOrder } };
  }

  async cancelItem(orderId: string, itemId: string, user: AuthUser) {
    const order = await this.findOrderOrThrow(orderId);

    if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new BadRequestException('Cannot cancel items on a closed order');
    }

    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
    });
    if (!item) throw new NotFoundException('Order item not found');

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status: 'CANCELLED' },
    });

    // Recalculate order totals
    await this.recalculateOrderTotals(orderId);

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    // Emit WebSocket event
    try {
      this.kitchenGateway?.emitOrderUpdated(order.siteId, {
        orderId,
        status: updatedOrder?.status ?? order.status,
        items: [],
      });
    } catch {
      // WebSocket failure should not break the HTTP response
    }

    return { success: true, data: updatedOrder };
  }

  // ══════════════════════════════════════════════════
  // DISCOUNTS
  // ══════════════════════════════════════════════════

  async applyDiscount(orderId: string, dto: ApplyDiscountDto, user: AuthUser) {
    const order = await this.findOrderOrThrow(orderId);

    if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new BadRequestException('Cannot apply discount to a closed order');
    }

    const discount = await this.prisma.discount.create({
      data: {
        orderId,
        type: dto.type,
        value: dto.value,
        reason: dto.reason,
        approvedBy: user.id,
      },
    });

    // Recalculate totals
    await this.recalculateOrderTotals(orderId);

    const updatedOrder = await this.prisma.order.findUnique({ where: { id: orderId } });

    return { success: true, data: { discount, order: updatedOrder } };
  }

  async removeDiscount(orderId: string, discountId: string, user: AuthUser) {
    const discount = await this.prisma.discount.findFirst({
      where: { id: discountId, orderId },
    });
    if (!discount) throw new NotFoundException('Discount not found');

    await this.prisma.discount.delete({ where: { id: discountId } });

    await this.recalculateOrderTotals(orderId);

    const updatedOrder = await this.prisma.order.findUnique({ where: { id: orderId } });

    return { success: true, data: updatedOrder };
  }

  // ══════════════════════════════════════════════════
  // CANCEL ORDER
  // ══════════════════════════════════════════════════

  async cancelOrder(orderId: string, user: AuthUser) {
    const order = await this.findOrderOrThrow(orderId);

    if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new BadRequestException('Order is already closed');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    // Mark all items as cancelled
    await this.prisma.orderItem.updateMany({
      where: { orderId },
      data: { status: 'CANCELLED' },
    });

    // Free the table
    if (order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'AVAILABLE' },
      });
    }

    // Emit WebSocket event
    try {
      this.kitchenGateway?.emitOrderUpdated(order.siteId, {
        orderId,
        status: 'CANCELLED',
        items: [],
      });
      this.cdsGateway?.emitOrderUpdated(order.id, {
        orderId,
        status: 'CANCELLED',
      });
    } catch {
      // WebSocket failure should not break the HTTP response
    }

    return { success: true, data: { message: 'Order cancelled' } };
  }

  // ══════════════════════════════════════════════════
  // KITCHEN QUEUE
  // ══════════════════════════════════════════════════

  async getKitchenQueue(siteId: string, user: AuthUser) {
    const site = await this.findSiteForUser(siteId, user);

    const orders = await this.prisma.order.findMany({
      where: {
        siteId: site.id,
        status: { in: ['CONFIRMED', 'PREPARING'] },
      },
      include: {
        items: {
          where: {
            status: { in: ['PENDING', 'PREPARING'] },
          },
          include: {
            modifiers: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        table: { select: { number: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = Date.now();
    const WARNING_THRESHOLD_SECONDS = 15 * 60; // 15 minutes

    // Group items by station
    const queue: Record<string, any[]> = {
      GRILL: [],
      FRY: [],
      COLD: [],
      DRINKS: [],
      DESSERT: [],
      EXPO: [],
    };

    for (const order of orders) {
      for (const item of order.items) {
        const station = item.station;
        if (queue[station]) {
          const elapsedMs = now - new Date(item.firedAt ?? item.createdAt).getTime();
          const elapsedSeconds = Math.floor(elapsedMs / 1000);

          queue[station].push({
            orderId: order.id,
            orderNumber: this.formatOrderNumber(site.slug, order.orderNumber),
            orderType: order.orderType,
            tableNumber: order.table?.number ?? null,
            guestCount: order.guestCount,
            itemId: item.id,
            itemName: item.name,
            quantity: item.quantity,
            modifiers: item.modifiers.map((m: any) => ({
              modifierName: m.modifierName,
              priceAdjustment: m.priceAdjustment,
            })),
            notes: item.notes,
            status: item.status,
            elapsedSeconds,
            priority: elapsedSeconds > WARNING_THRESHOLD_SECONDS,
            createdAt: (item.firedAt ?? item.createdAt).toISOString(),
          });
        }
      }
    }

    // Sort each station's items by elapsed time (oldest first)
    for (const station of Object.keys(queue)) {
      const stationQueue = queue[station];
      if (stationQueue) {
        stationQueue.sort((a: any, b: any) => b.elapsedSeconds - a.elapsedSeconds);
      }
    }

    return { success: true, data: { stations: queue } };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  private async getNextOrderNumber(siteId: string): Promise<number> {
    // Use a transaction to prevent race conditions
    const result = await this.prisma.$transaction(async (tx: any) => {
      const lastOrder = await tx.order.findFirst({
        where: { siteId },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });
      return (lastOrder?.orderNumber ?? 0) + 1;
    });
    return result;
  }

  private formatOrderNumber(siteSlug: string, orderNumber: number): string {
    return `SITE-${siteSlug.toUpperCase()}-${String(orderNumber).padStart(5, '0')}`;
  }

  private async recalculateOrderTotals(orderId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId, status: { not: 'CANCELLED' } },
    });

    const activeSubTotal = items.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0);
    const activeTaxTotal = items.reduce(
      (sum: number, item: any) => sum + (Number(item.totalPrice) * Number(item.taxRate)) / 100,
      0,
    );

    const discounts = await this.prisma.discount.findMany({
      where: { orderId },
    });

    let discountTotal = 0;
    for (const d of discounts) {
      if (d.type === 'PERCENTAGE') {
        discountTotal += (activeSubTotal * Number(d.value)) / 100;
      } else if (d.type === 'FIXED_AMOUNT') {
        discountTotal += Number(d.value);
      }
      // ITEM and COMP are handled differently — simplified for MVP
    }

    const grandTotal = Math.max(0, activeSubTotal + activeTaxTotal - discountTotal);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subTotal: activeSubTotal,
        taxTotal: activeTaxTotal,
        discountTotal,
        grandTotal,
      },
    });
  }

  private async findOrderOrThrow(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async findSiteForUser(siteId: string, user: AuthUser) {
    const where: Prisma.SiteWhereInput = { id: siteId };

    if (user.role !== Role.SUPER_ADMIN && user.tenantId) {
      where.tenantId = user.tenantId;
    }

    const site = await this.prisma.site.findFirst({ where });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }
}
