import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, TicketStatus, MaintenanceFrequency } from '@omniops/shared';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetStatusDto,
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  TicketStatusDto,
  AddCommentDto,
  AddPhotoDto,
  CreateVendorDto,
  UpdateVendorDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from './dto';

const SLA_HOURS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};

const VALID_TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['ASSIGNED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN', 'CLOSED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD: ['IN_PROGRESS', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

const FREQUENCY_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
  QUARTERLY: 90,
  BIANNUAL: 182,
  ANNUAL: 365,
};

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  private tenantGuard(siteId: string, user: { tenantId: string | null; role: Role }) {
    return { tenantId: user.tenantId!, siteId };
  }

  private async verifySiteAccess(siteId: string, user: { tenantId: string | null; role: Role }) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    if (user.role !== Role.SUPER_ADMIN && site.tenantId !== user.tenantId) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  // ═══════════════════════════════════════════
  // ASSETS
  // ═══════════════════════════════════════════

  async listAssets(
    siteId: string | undefined,
    user: { tenantId: string | null; role: Role },
    filters?: { category?: string; status?: string; page?: number; limit?: number },
  ) {
    const where: any = {};
    if (siteId) {
      await this.verifySiteAccess(siteId, user);
      where.siteId = siteId;
    } else if (user.role !== Role.SUPER_ADMIN) {
      where.tenantId = user.tenantId;
    }
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          schedules: {
            where: { isActive: true },
            select: { id: true, title: true, nextDueAt: true, frequency: true },
            orderBy: { nextDueAt: 'asc' },
          },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { success: true, data, meta: { page, limit, total } };
  }

  async getAsset(id: string, user: { tenantId: string | null; role: Role }) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true, tenantId: true } },
        tickets: { orderBy: { createdAt: 'desc' }, take: 20 },
        schedules: { orderBy: { nextDueAt: 'asc' } },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (user.role !== Role.SUPER_ADMIN && asset.tenantId !== user.tenantId) {
      throw new NotFoundException('Asset not found');
    }
    return { success: true, data: asset };
  }

  async createAsset(dto: CreateAssetDto, user: { tenantId: string | null; role: Role }) {
    const site = await this.verifySiteAccess(dto.siteId, user);
    const asset = await this.prisma.asset.create({
      data: {
        tenantId: site.tenantId,
        siteId: dto.siteId,
        name: dto.name,
        category: dto.category,
        model: dto.model,
        serialNumber: dto.serialNumber,
        manufacturer: dto.manufacturer,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
        location: dto.location,
        status: dto.status ?? 'OPERATIONAL',
        notes: dto.notes,
        imageUrl: dto.imageUrl,
      },
    });
    return { success: true, data: asset };
  }

  async updateAsset(id: string, dto: UpdateAssetDto, user: { tenantId: string | null; role: Role }) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (user.role !== Role.SUPER_ADMIN && asset.tenantId !== user.tenantId) {
      throw new NotFoundException('Asset not found');
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
      },
    });
    return { success: true, data: updated };
  }

  async updateAssetStatus(id: string, dto: AssetStatusDto, user: { tenantId: string | null; role: Role }) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (user.role !== Role.SUPER_ADMIN && asset.tenantId !== user.tenantId) {
      throw new NotFoundException('Asset not found');
    }
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status: dto.status as any },
    });
    return { success: true, data: updated };
  }

  // ═══════════════════════════════════════════
  // TICKETS
  // ═══════════════════════════════════════════

  async listTickets(
    siteId: string | undefined,
    user: { tenantId: string | null; role: Role },
    filters?: {
      status?: string;
      priority?: string;
      category?: string;
      assignedToId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = {};
    if (siteId) {
      await this.verifySiteAccess(siteId, user);
      where.siteId = siteId;
    } else if (user.role !== Role.SUPER_ADMIN) {
      where.tenantId = user.tenantId;
    }
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, name: true, category: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          vendor: { select: { id: true, name: true } },
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);

    return { success: true, data, meta: { page, limit, total } };
  }

  async getTicket(id: string, user: { tenantId: string | null; role: Role }) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, category: true, location: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        vendor: true,
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        site: { select: { id: true, name: true } },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== Role.SUPER_ADMIN && ticket.tenantId !== user.tenantId) {
      throw new NotFoundException('Ticket not found');
    }
    return { success: true, data: ticket };
  }

  async createTicket(dto: CreateTicketDto, user: { tenantId: string | null; role: Role; sub: string }) {
    const site = await this.verifySiteAccess(dto.siteId, user);

    const priority = dto.priority ?? 'MEDIUM';
    const slaHours = SLA_HOURS[priority] ?? 72;
    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await this.prisma.maintenanceTicket.create({
      data: {
        tenantId: site.tenantId,
        siteId: dto.siteId,
        assetId: dto.assetId,
        title: dto.title,
        description: dto.description,
        priority: priority as any,
        category: dto.category,
        status: 'OPEN',
        reportedById: user.sub,
        slaDueAt,
      },
      include: {
        asset: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return { success: true, data: ticket };
  }

  async updateTicket(id: string, dto: UpdateTicketDto, user: { tenantId: string | null; role: Role }) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== Role.SUPER_ADMIN && ticket.tenantId !== user.tenantId) {
      throw new NotFoundException('Ticket not found');
    }
    const updated = await this.prisma.maintenanceTicket.update({
      where: { id },
      data: dto as any,
    });
    return { success: true, data: updated };
  }

  async assignTicket(id: string, dto: AssignTicketDto, user: { tenantId: string | null; role: Role }) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== Role.SUPER_ADMIN && ticket.tenantId !== user.tenantId) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = { status: 'ASSIGNED' };
    if (dto.assignedToId) updateData.assignedToId = dto.assignedToId;
    if (dto.vendorId) updateData.vendorId = dto.vendorId;

    const updated = await this.prisma.maintenanceTicket.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        vendor: { select: { id: true, name: true } },
      },
    });
    return { success: true, data: updated };
  }

  async updateTicketStatus(id: string, dto: TicketStatusDto, user: { tenantId: string | null; role: Role }) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== Role.SUPER_ADMIN && ticket.tenantId !== user.tenantId) {
      throw new NotFoundException('Ticket not found');
    }

    const allowed = VALID_TICKET_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${ticket.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updateData: any = { status: dto.status as any };
    if (dto.status === 'RESOLVED') updateData.resolvedAt = new Date();
    if (dto.status === 'CLOSED') updateData.closedAt = new Date();

    const updated = await this.prisma.maintenanceTicket.update({ where: { id }, data: updateData });
    return { success: true, data: updated };
  }

  async addComment(ticketId: string, dto: AddCommentDto, user: { tenantId: string | null; role: Role; sub: string }) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== Role.SUPER_ADMIN && ticket.tenantId !== user.tenantId) {
      throw new NotFoundException('Ticket not found');
    }

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        userId: user.sub,
        content: dto.content,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    return { success: true, data: comment };
  }

  async addPhoto(ticketId: string, dto: AddPhotoDto, user: { tenantId: string | null; role: Role }) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== Role.SUPER_ADMIN && ticket.tenantId !== user.tenantId) {
      throw new NotFoundException('Ticket not found');
    }

    const photo = await this.prisma.ticketPhoto.create({
      data: {
        ticketId,
        url: dto.url,
        caption: dto.caption,
      },
    });
    return { success: true, data: photo };
  }

  // ═══════════════════════════════════════════
  // VENDORS
  // ═══════════════════════════════════════════

  async listVendors(user: { tenantId: string | null; role: Role }, category?: string) {
    const where: any = {};
    if (user.role !== Role.SUPER_ADMIN) where.tenantId = user.tenantId!;
    if (category) where.category = category;

    const data = await this.prisma.vendor.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  }

  async createVendor(dto: CreateVendorDto, user: { tenantId: string | null; role: Role }) {
    let tenantId = user.tenantId;
    if (dto.siteId) {
      const site = await this.verifySiteAccess(dto.siteId, user);
      tenantId = site.tenantId;
    } else if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('siteId is required for super admin');
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        tenantId: tenantId!,
        name: dto.name,
        category: dto.category,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        rating: dto.rating,
        isActive: dto.isActive ?? true,
      },
    });
    return { success: true, data: vendor };
  }

  async updateVendor(id: string, dto: UpdateVendorDto, user: { tenantId: string | null; role: Role }) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (user.role !== Role.SUPER_ADMIN && vendor.tenantId !== user.tenantId) {
      throw new NotFoundException('Vendor not found');
    }
    const updated = await this.prisma.vendor.update({ where: { id }, data: dto as any });
    return { success: true, data: updated };
  }

  // ═══════════════════════════════════════════
  // PREVENTIVE SCHEDULES
  // ═══════════════════════════════════════════

  async listSchedules(
    user: { tenantId: string | null; role: Role },
    filters?: { assetId?: string; siteId?: string },
  ) {
    const where: any = {};
    if (filters?.assetId) {
      where.assetId = filters.assetId;
    }
    if (filters?.siteId) {
      where.asset = { siteId: filters.siteId };
    }

    const data = await this.prisma.preventiveSchedule.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, siteId: true, site: { select: { id: true, name: true, tenantId: true } } } },
      },
      orderBy: { nextDueAt: 'asc' },
    });

    // Tenant-scope filtering
    if (user.role !== Role.SUPER_ADMIN) {
      return {
        success: true,
        data: data.filter((s) => s.asset.site.tenantId === user.tenantId),
      };
    }

    return { success: true, data };
  }

  async createSchedule(dto: CreateScheduleDto, user: { tenantId: string | null; role: Role }) {
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (user.role !== Role.SUPER_ADMIN && asset.tenantId !== user.tenantId) {
      throw new NotFoundException('Asset not found');
    }

    let nextDueAt = dto.nextDueAt ? new Date(dto.nextDueAt) : new Date();
    if (!dto.nextDueAt) {
      const days = FREQUENCY_DAYS[dto.frequency] ?? 30;
      nextDueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const schedule = await this.prisma.preventiveSchedule.create({
      data: {
        assetId: dto.assetId,
        title: dto.title,
        description: dto.description,
        frequency: dto.frequency as any,
        nextDueAt,
      },
      include: { asset: { select: { id: true, name: true } } },
    });
    return { success: true, data: schedule };
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto, user: { tenantId: string | null; role: Role }) {
    const schedule = await this.prisma.preventiveSchedule.findUnique({
      where: { id },
      include: { asset: { select: { tenantId: true } } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (user.role !== Role.SUPER_ADMIN && schedule.asset.tenantId !== user.tenantId) {
      throw new NotFoundException('Schedule not found');
    }

    const updateData: any = { ...dto };
    if (dto.nextDueAt) updateData.nextDueAt = new Date(dto.nextDueAt);

    const updated = await this.prisma.preventiveSchedule.update({
      where: { id },
      data: updateData,
    });
    return { success: true, data: updated };
  }

  async completeSchedule(id: string, user: { tenantId: string | null; role: Role }) {
    const schedule = await this.prisma.preventiveSchedule.findUnique({
      where: { id },
      include: { asset: { select: { tenantId: true } } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (user.role !== Role.SUPER_ADMIN && schedule.asset.tenantId !== user.tenantId) {
      throw new NotFoundException('Schedule not found');
    }

    const days = FREQUENCY_DAYS[schedule.frequency] ?? 30;
    const nextDueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.preventiveSchedule.update({
      where: { id },
      data: {
        lastDoneAt: new Date(),
        nextDueAt,
      },
    });
    return { success: true, data: updated };
  }
}
