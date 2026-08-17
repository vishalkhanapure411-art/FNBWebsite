import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CdsService {
  constructor(private prisma: PrismaService) {}

  async getCdsOrderView(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: { modifiers: true },
          orderBy: { createdAt: 'asc' },
        },
        discounts: true,
        payments: {
          where: { status: { in: ['CAPTURED', 'AUTHORIZED'] } },
        },
        table: { select: { number: true } },
        site: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderNumber = `SITE-${order.site.slug}-${String(order.orderNumber).padStart(4, '0')}`;

    const items = order.items.map((item) => {
      const modifierStrings: string[] = [];
      for (const m of item.modifiers) {
        const adj = Number(m.priceAdjustment);
        if (adj > 0) {
          modifierStrings.push(m.modifierName + ' +$' + adj.toFixed(2));
        } else {
          modifierStrings.push(m.modifierName);
        }
      }

      return {
        name: item.name,
        qty: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.totalPrice),
        modifiers: modifierStrings,
        status: item.status,
      };
    });

    const subtotal = Number(order.subTotal);
    const tax = Number(order.taxTotal);

    const discounts = order.discounts.map((d) => ({
      type: d.type as string,
      value: Number(d.value),
      amount:
        d.type === 'PERCENTAGE'
          ? Number(((subtotal * Number(d.value)) / 100).toFixed(2))
          : Number(d.value),
    }));

    const grandTotal = Number(order.grandTotal);

    const payments = order.payments
      .filter((p) => p.status === 'CAPTURED' || p.status === 'AUTHORIZED')
      .map((p) => ({
        method: p.method as string,
        amount: Number(p.amount),
      }));

    return {
      orderNumber,
      orderType: order.orderType as string,
      table: order.table?.number ?? null,
      guestCount: order.guestCount,
      items,
      subtotal,
      tax,
      discounts,
      grandTotal,
      payments,
      status: order.status as string,
      siteName: order.site.name,
    };
  }

  getUpsells() {
    return {
      upsells: [
        {
          id: '1',
          type: 'COMBO',
          name: 'Meal Deal',
          description: 'Add fries + drink for $4.99',
          comboPrice: 4.99,
        },
        {
          id: '2',
          type: 'ADDON',
          name: 'Make it Large',
          description: 'Upgrade to large for $2',
          priceAdjustment: 2.0,
        },
      ],
    };
  }
}
