import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTableDto, UpdateTableDto, TableStatusDto } from './dto';
import { Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTableDto, user: { tenantId: string | null; role: Role }) {
    // Verify floor plan exists
    const floorPlan = await this.prisma.floorPlan.findUnique({
      where: { id: dto.floorPlanId },
      include: { site: { select: { tenantId: true } } },
    });

    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }

    if (user.role !== Role.SUPER_ADMIN && floorPlan.site.tenantId !== user.tenantId) {
      throw new NotFoundException('Floor plan not found');
    }

    // Check table number uniqueness within site
    const existing = await this.prisma.table.findUnique({
      where: { siteId_number: { siteId: dto.siteId, number: dto.number } },
    });

    if (existing) {
      throw new ConflictException(`Table number "${dto.number}" already exists at this site`);
    }

    const table = await this.prisma.table.create({
      data: {
        floorPlanId: dto.floorPlanId,
        siteId: dto.siteId,
        number: dto.number,
        section: dto.section,
        capacity: dto.capacity ?? 4,
        position: dto.position as Prisma.InputJsonValue ?? undefined,
        status: 'AVAILABLE',
      },
    });

    return { success: true, data: table };
  }

  async findAll(
    query: { siteId?: string; floorPlanId?: string },
    user: { tenantId: string | null; role: Role; siteId?: string | null },
  ) {
    const where: Prisma.TableWhereInput = {};

    // For SITE_LEAD, scope to their site
    if (user.role === Role.SITE_LEAD && user.siteId) {
      where.siteId = user.siteId;
    } else if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.floorPlanId) {
      where.floorPlanId = query.floorPlanId;
    }

    // Tenant scoping for non-super-admin
    if (user.role !== Role.SUPER_ADMIN && !where.siteId) {
      // Get site IDs for this tenant
      const sites = await this.prisma.site.findMany({
        where: { tenantId: user.tenantId ?? undefined },
        select: { id: true },
      });
      where.siteId = { in: sites.map((s) => s.id) };
    }

    const tables = await this.prisma.table.findMany({
      where,
      orderBy: [{ floorPlanId: 'asc' }, { section: 'asc' }, { number: 'asc' }],
      include: {
        floorPlan: { select: { id: true, name: true } },
      },
    });

    return { success: true, data: tables };
  }

  async update(id: string, dto: UpdateTableDto, user: { tenantId: string | null; role: Role }) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { site: { select: { tenantId: true } } },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (user.role !== Role.SUPER_ADMIN && table.site.tenantId !== user.tenantId) {
      throw new NotFoundException('Table not found');
    }

    // If number is changing, check uniqueness
    if (dto.number && dto.number !== table.number) {
      const existing = await this.prisma.table.findUnique({
        where: { siteId_number: { siteId: table.siteId, number: dto.number } },
      });
      if (existing) {
        throw new ConflictException(`Table number "${dto.number}" already exists at this site`);
      }
    }

    const updateData: Prisma.TableUpdateInput = {
      ...(dto.number !== undefined ? { number: dto.number } : {}),
      ...(dto.section !== undefined ? { section: dto.section } : {}),
      ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      ...(dto.position !== undefined ? { position: dto.position as Prisma.InputJsonValue } : {}),
      ...(dto.status !== undefined ? { status: dto.status as any } : {}),
    };

    const updated = await this.prisma.table.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: updated };
  }

  async remove(id: string, user: { tenantId: string | null; role: Role }) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { site: { select: { tenantId: true } } },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (user.role !== Role.SUPER_ADMIN && table.site.tenantId !== user.tenantId) {
      throw new NotFoundException('Table not found');
    }

    await this.prisma.table.delete({ where: { id } });

    return { success: true, data: null };
  }

  async updateStatus(id: string, dto: TableStatusDto, user: { tenantId: string | null; role: Role }) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { site: { select: { tenantId: true } } },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (user.role !== Role.SUPER_ADMIN && table.site.tenantId !== user.tenantId) {
      throw new NotFoundException('Table not found');
    }

    const updated = await this.prisma.table.update({
      where: { id },
      data: { status: dto.status },
    });

    return { success: true, data: updated };
  }
}
