import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFloorPlanDto, UpdateFloorPlanDto } from './dto';
import { Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class FloorPlansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFloorPlanDto, user: { tenantId: string | null; role: Role }) {
    // Verify site exists
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (user.role !== Role.SUPER_ADMIN && site.tenantId !== user.tenantId) {
      throw new NotFoundException('Site not found');
    }

    const floorPlan = await this.prisma.floorPlan.create({
      data: {
        siteId: dto.siteId,
        name: dto.name,
        description: dto.description,
        layout: dto.layout as Prisma.InputJsonValue ?? undefined,
        isActive: dto.isActive ?? true,
      },
    });

    return { success: true, data: floorPlan };
  }

  async findAll(siteId: string, user: { tenantId: string | null; role: Role }) {
    if (!siteId) {
      throw new NotFoundException('siteId query parameter is required');
    }

    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (user.role !== Role.SUPER_ADMIN && site.tenantId !== user.tenantId) {
      throw new NotFoundException('Site not found');
    }

    const floorPlans = await this.prisma.floorPlan.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      include: {
        tables: { select: { id: true, number: true, status: true, capacity: true, section: true, position: true } },
      },
    });

    return { success: true, data: floorPlans };
  }

  async update(id: string, dto: UpdateFloorPlanDto, user: { tenantId: string | null; role: Role }) {
    const floorPlan = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: { site: { select: { tenantId: true } } },
    });

    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }

    if (user.role !== Role.SUPER_ADMIN && floorPlan.site.tenantId !== user.tenantId) {
      throw new NotFoundException('Floor plan not found');
    }

    const updated = await this.prisma.floorPlan.update({
      where: { id },
      data: {
        ...dto,
        layout: dto.layout as Prisma.InputJsonValue | undefined,
      },
    });

    return { success: true, data: updated };
  }

  async remove(id: string, user: { tenantId: string | null; role: Role }) {
    const floorPlan = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: { site: { select: { tenantId: true } } },
    });

    if (!floorPlan) {
      throw new NotFoundException('Floor plan not found');
    }

    if (user.role !== Role.SUPER_ADMIN && floorPlan.site.tenantId !== user.tenantId) {
      throw new NotFoundException('Floor plan not found');
    }

    // Tables cascade-delete via Prisma schema
    await this.prisma.floorPlan.delete({ where: { id } });

    return { success: true, data: null };
  }
}
