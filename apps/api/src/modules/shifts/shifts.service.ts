import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenShiftDto, CloseShiftDto, QueryShiftsDto, AddStaffDto } from './dto';
import { ShiftStatus, Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async openShift(dto: OpenShiftDto, user: { sub: string; tenantId: string | null; role: Role; siteId?: string | null }) {
    const siteId = dto.siteId;

    // Check site exists
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Tenant scoping
    if (user.role !== Role.SUPER_ADMIN) {
      if (site.tenantId !== user.tenantId) {
        throw new NotFoundException('Site not found');
      }
    }

    // Check no open shift exists for this site
    const existingOpen = await this.prisma.shift.findFirst({
      where: { siteId, status: ShiftStatus.OPEN },
    });
    if (existingOpen) {
      throw new ConflictException('Site already has an open shift');
    }

    const shift = await this.prisma.shift.create({
      data: {
        siteId,
        name: dto.name ?? `Shift ${new Date().toLocaleDateString()}`,
        startTime: new Date(),
        openedById: user.sub,
        openingCash: dto.openingCash ?? 0,
        notes: dto.notes,
        status: ShiftStatus.OPEN,
      },
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return { success: true, data: shift };
  }

  async closeShift(id: string, dto: CloseShiftDto, user: { sub: string; tenantId: string | null; role: Role }) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: { site: { select: { tenantId: true } } },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException(`Cannot close shift with status ${shift.status}`);
    }

    // Tenant scoping
    if (user.role !== Role.SUPER_ADMIN) {
      if (shift.site.tenantId !== user.tenantId) {
        throw new NotFoundException('Shift not found');
      }
    }

    // Calculate expected cash: openingCash + cash sales - cash refunds
    const cashPayments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        order: { siteId: shift.siteId },
        method: 'CASH',
        status: 'CAPTURED',
        createdAt: { gte: shift.startTime, lte: new Date() },
      },
    });

    const cashRefunds = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        order: { siteId: shift.siteId },
        method: 'CASH',
        status: 'REFUNDED',
        createdAt: { gte: shift.startTime, lte: new Date() },
      },
    });

    const cashSales = cashPayments._sum.amount ?? 0;
    const cashRefundTotal = cashRefunds._sum.amount ?? 0;
    const openingCash = Number(shift.openingCash ?? 0);
    const closingCash = Number(dto.closingCash ?? 0);
    const expectedCash = Number(openingCash) + Number(cashSales) - Number(cashRefundTotal);
    const cashVariance = closingCash - expectedCash;

    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        closingCash,
        expectedCash,
        cashVariance,
        closedById: user.sub,
        endTime: new Date(),
        notes: dto.notes ?? shift.notes,
        status: ShiftStatus.CLOSED,
      },
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        closedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        staffList: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
        },
      },
    });

    return { success: true, data: updated };
  }

  async findAll(query: QueryShiftsDto, user: { tenantId: string | null; role: Role; siteId?: string | null }) {
    const where: Prisma.ShiftWhereInput = {};

    // Role-based scoping
    if (user.role === Role.SITE_LEAD) {
      if (user.siteId) {
        where.siteId = user.siteId;
      }
    } else if (user.role === Role.BRAND_MANAGER) {
      // BRAND_MANAGER sees their tenant's shifts
      where.site = { tenantId: user.tenantId ?? undefined };
    }
    // SUPER_ADMIN sees all

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.status) {
      where.status = query.status as ShiftStatus;
    }

    if (query.startDate || query.endDate) {
      where.startTime = {};
      if (query.startDate) {
        where.startTime.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startTime.lte = new Date(query.endDate);
      }
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          site: { select: { id: true, name: true } },
          openedBy: { select: { id: true, firstName: true, lastName: true } },
          closedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.shift.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, user: { tenantId: string | null; role: Role }) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true, tenantId: true } },
        openedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        closedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        staffList: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Tenant scoping
    if (user.role !== Role.SUPER_ADMIN) {
      if (shift.site.tenantId !== user.tenantId) {
        throw new NotFoundException('Shift not found');
      }
    }

    // Cash summary
    const cashPayments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        order: { siteId: shift.siteId },
        method: 'CASH',
        status: 'CAPTURED',
        createdAt: { gte: shift.startTime },
      },
    });

    const cardPayments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        order: { siteId: shift.siteId },
        method: 'CARD',
        status: 'CAPTURED',
        createdAt: { gte: shift.startTime },
      },
    });

    const totalOrders = await this.prisma.order.count({
      where: {
        siteId: shift.siteId,
        createdAt: { gte: shift.startTime },
        status: 'COMPLETED',
      },
    });

    return {
      success: true,
      data: {
        ...shift,
        cashSummary: {
          openingCash: shift.openingCash,
          closingCash: shift.closingCash,
          expectedCash: shift.expectedCash,
          cashVariance: shift.cashVariance,
          cashSales: cashPayments._sum.amount ?? 0,
          cardSales: cardPayments._sum.amount ?? 0,
          totalOrders,
        },
      },
    };
  }

  async addStaff(shiftId: string, dto: AddStaffDto, user: { tenantId: string | null; role: Role }) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { site: { select: { tenantId: true } } },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException('Can only add staff to open shifts');
    }

    if (user.role !== Role.SUPER_ADMIN) {
      if (shift.site.tenantId !== user.tenantId) {
        throw new NotFoundException('Shift not found');
      }
    }

    // Verify user exists
    const targetUser = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.shiftStaff.create({
      data: {
        shiftId,
        userId: dto.userId,
      },
    });

    return { success: true, data: { shiftId, userId: dto.userId } };
  }

  async removeStaff(shiftId: string, userId: string, user: { tenantId: string | null; role: Role }) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { site: { select: { tenantId: true } } },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (user.role !== Role.SUPER_ADMIN) {
      if (shift.site.tenantId !== user.tenantId) {
        throw new NotFoundException('Shift not found');
      }
    }

    await this.prisma.shiftStaff.delete({
      where: { shiftId_userId: { shiftId, userId } },
    });

    return { success: true, data: null };
  }

  async getActiveShift(siteId: string, user: { tenantId: string | null; role: Role; siteId?: string | null }) {
    // For SITE_LEAD, use their siteId
    const effectiveSiteId = (user.role === Role.SITE_LEAD && (user as any).siteId) ? (user as any).siteId : siteId;

    const shift = await this.prisma.shift.findFirst({
      where: { siteId: effectiveSiteId, status: ShiftStatus.OPEN },
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true } },
        staffList: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    // Tenant scoping for non-super-admin
    if (shift && user.role !== Role.SUPER_ADMIN) {
      const site = await this.prisma.site.findUnique({
        where: { id: effectiveSiteId },
        select: { tenantId: true },
      });
      if (site?.tenantId !== user.tenantId) {
        return { success: true, data: null };
      }
    }

    return { success: true, data: shift };
  }
}
