import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@omniops/shared';
import { Prisma, DeviceType, Station } from '@prisma/client';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  DevicesQueryDto,
  CreateRoutingDto,
  UpdateRoutingDto,
  RoutingsQueryDto,
} from './dto';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; sub: string };

@Injectable()
export class ItService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────
  // Access helpers (tenant isolation + site-scoped IT lock —
  // site-scoped IT may only touch their own site; device & routing
  // operations are site-scoped so a siteId resolves the context)
  // ──────────────────────────────────────────────────────────────

  private resolveTenant(user: AuthUser, siteId?: string): Promise<string> {
    return (async () => {
      if (user.tenantId) return user.tenantId;
      if (siteId) {
        const site = await this.prisma.site.findUnique({ where: { id: siteId } });
        if (site) return site.tenantId;
      }
      throw new BadRequestException('Unable to resolve tenant for this operation');
    })();
  }

  private async resolveSiteContext(siteId: string | undefined, user: AuthUser) {
    if (!siteId && user.siteId) siteId = user.siteId;
    const where: Prisma.SiteWhereInput = { id: siteId };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const site = await this.prisma.site.findFirst({ where });
    if (!site) {
      if (!siteId) throw new BadRequestException('siteId is required');
      throw new BadRequestException('Site not found');
    }
    // Site-scoped IT may only access their own site.
    if (user.siteId && user.role !== Role.SUPER_ADMIN && site.id !== user.siteId) {
      throw new ForbiddenException('You do not have access to this site');
    }
    return site;
  }

  private assertStation(value: string | undefined, field: string): void {
    if (value !== undefined && !Object.values(Station).includes(value as Station)) {
      throw new BadRequestException(`Invalid ${field}: ${value}`);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Devices CRUD (KDS / CDS / KOT printers, site-scoped)
  // ──────────────────────────────────────────────────────────────

  async createDevice(dto: CreateDeviceDto, user: AuthUser) {
    const site = await this.resolveSiteContext(dto.siteId, user);
    if (!Object.values(DeviceType).includes(dto.type)) {
      throw new BadRequestException(`Invalid device type: ${dto.type}`);
    }
    this.assertStation(dto.station as string | undefined, 'station');
    const device = await this.prisma.device.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        name: dto.name,
        type: dto.type,
        deviceId: dto.deviceId,
        station: dto.station ?? null,
        ipAddress: dto.ipAddress ?? null,
        notes: dto.notes ?? null,
      },
      include: { site: { select: { id: true, name: true } } },
    });
    return { success: true, data: device };
  }

  async listDevices(user: AuthUser, query: DevicesQueryDto) {
    const site = await this.resolveSiteContext(query.siteId, user);
    const where: Prisma.DeviceWhereInput = { siteId: site.id, tenantId: site.tenantId };
    if (query.type) {
      if (!Object.values(DeviceType).includes(query.type as DeviceType)) {
        throw new BadRequestException(`Invalid device type: ${query.type}`);
      }
      where.type = query.type as DeviceType;
    }
    const devices = await this.prisma.device.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { site: { select: { id: true, name: true } } },
    });
    return { success: true, data: devices };
  }

  async getDevice(id: string, user: AuthUser) {
    const device = await this.findDevice(id, user);
    return { success: true, data: device };
  }

  async updateDevice(id: string, dto: UpdateDeviceDto, user: AuthUser) {
    const existing = await this.findDevice(id, user);
    if (dto.type !== undefined && !Object.values(DeviceType).includes(dto.type)) {
      throw new BadRequestException(`Invalid device type: ${dto.type}`);
    }
    this.assertStation(dto.station as string | undefined, 'station');
    const data: Prisma.DeviceUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.station !== undefined) data.station = dto.station ?? null;
    if (dto.ipAddress !== undefined) data.ipAddress = dto.ipAddress ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.isOnline !== undefined) data.isOnline = dto.isOnline;
    if (dto.lastHeartbeat !== undefined) data.lastHeartbeat = new Date(dto.lastHeartbeat);
    const device = await this.prisma.device.update({
      where: { id: existing.id },
      data,
      include: { site: { select: { id: true, name: true } } },
    });
    return { success: true, data: device };
  }

  async deleteDevice(id: string, user: AuthUser) {
    const existing = await this.findDevice(id, user);
    // DECISION: block deletion while referenced as a routing printer —
    // fail loudly with a clear error rather than silently unlinking.
    const refCount = await this.prisma.productRouting.count({ where: { printerId: existing.id } });
    if (refCount > 0) {
      throw new BadRequestException(
        `Device is the printer for ${refCount} product routing(s); change or delete those routings first`,
      );
    }
    await this.prisma.device.delete({ where: { id: existing.id } });
    return { success: true, data: { id: existing.id, deleted: true } };
  }

  private async findDevice(id: string, user: AuthUser) {
    const where: Prisma.DeviceWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const device = await this.prisma.device.findFirst({
      where,
      include: { site: { select: { id: true, name: true } } },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (user.siteId && user.role !== Role.SUPER_ADMIN && device.siteId !== user.siteId) {
      throw new ForbiddenException('You do not have access to this device');
    }
    return device;
  }

  // ──────────────────────────────────────────────────────────────
  // Product routings CRUD (menu item → station + optional KOT printer)
  // ──────────────────────────────────────────────────────────────

  async createRouting(dto: CreateRoutingDto, user: AuthUser) {
    const site = await this.resolveSiteContext(dto.siteId, user);
    this.assertStation(dto.station as string, 'station');
    // Menu item must exist and belong to the site's tenant.
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: dto.menuItemId, menu: { tenantId: site.tenantId } },
    });
    if (!menuItem) throw new BadRequestException('Menu item not found in this tenant');
    // Optional printer must be a KOT_PRINTER in the same site.
    const printerId = await this.validatePrinter(dto.printerId, site.id, site.tenantId);
    await this.assertNoRoutingConflict(site.id, menuItem.id, dto.station as Station);
    const routing = await this.prisma.productRouting.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        menuItemId: menuItem.id,
        station: dto.station as Station,
        printerId,
      },
      include: this.routingInclude,
    });
    return { success: true, data: routing };
  }

  async listRoutings(user: AuthUser, query: RoutingsQueryDto) {
    const site = await this.resolveSiteContext(query.siteId, user);
    const where: Prisma.ProductRoutingWhereInput = { siteId: site.id, tenantId: site.tenantId };
    if (query.station) {
      this.assertStation(query.station, 'station');
      where.station = query.station as Station;
    }
    if (query.menuItemId) where.menuItemId = query.menuItemId;
    const routings = await this.prisma.productRouting.findMany({
      where,
      orderBy: [{ menuItemId: 'asc' }, { station: 'asc' }],
      include: this.routingInclude,
    });
    return { success: true, data: routings };
  }

  async getRouting(id: string, user: AuthUser) {
    const routing = await this.findRouting(id, user);
    return { success: true, data: routing };
  }

  async updateRouting(id: string, dto: UpdateRoutingDto, user: AuthUser) {
    const existing = await this.findRouting(id, user);
    this.assertStation(dto.station as string | undefined, 'station');
    const data: Prisma.ProductRoutingUpdateInput = {};
    if (dto.station !== undefined) {
      await this.assertNoRoutingConflict(existing.siteId, existing.menuItemId, dto.station as Station, existing.id);
      data.station = dto.station;
    }
    if (dto.printerId !== undefined) {
      if (dto.printerId === null || dto.printerId === '') {
        data.printer = { disconnect: true };
      } else {
        const printerId = await this.validatePrinter(dto.printerId, existing.siteId, existing.tenantId);
        if (!printerId) {
          throw new BadRequestException('Printer must be a KOT_PRINTER device in the same site');
        }
        data.printer = { connect: { id: printerId } };
      }
    }
    const routing = await this.prisma.productRouting.update({
      where: { id: existing.id },
      data,
      include: this.routingInclude,
    });
    return { success: true, data: routing };
  }

  async deleteRouting(id: string, user: AuthUser) {
    const routing = await this.findRouting(id, user);
    await this.prisma.productRouting.delete({ where: { id: routing.id } });
    return { success: true, data: { id: routing.id, deleted: true } };
  }

  private async validatePrinter(
    printerId: string | undefined,
    siteId: string,
    tenantId: string,
  ): Promise<string | null> {
    if (!printerId) return null;
    const printer = await this.prisma.device.findFirst({
      where: { id: printerId, siteId, tenantId, type: DeviceType.KOT_PRINTER },
    });
    if (!printer) {
      throw new BadRequestException('Printer must be a KOT_PRINTER device in the same site');
    }
    return printer.id;
  }

  private async assertNoRoutingConflict(
    siteId: string,
    menuItemId: string,
    station: Station,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.productRouting.findFirst({
      where: { siteId, menuItemId, station, NOT: excludeId ? { id: excludeId } : undefined },
    });
    if (conflict) {
      throw new BadRequestException(
        'A routing for this menu item + station already exists at this site',
      );
    }
  }

  private routingInclude = {
    menuItem: { select: { id: true, name: true } },
    printer: { select: { id: true, name: true, deviceId: true } },
    site: { select: { id: true, name: true } },
  } satisfies Prisma.ProductRoutingInclude;

  private async findRouting(id: string, user: AuthUser) {
    const where: Prisma.ProductRoutingWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const routing = await this.prisma.productRouting.findFirst({
      where,
      include: this.routingInclude,
    });
    if (!routing) throw new NotFoundException('Product routing not found');
    if (user.siteId && user.role !== Role.SUPER_ADMIN && routing.siteId !== user.siteId) {
      throw new ForbiddenException('You do not have access to this product routing');
    }
    return routing;
  }
}