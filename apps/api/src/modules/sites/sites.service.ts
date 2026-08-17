import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSiteDto, UpdateSiteDto, SiteStatusDto, QuerySitesDto } from './dto';
import { SiteStatus, Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QuerySitesDto, user: { tenantId: string | null; role: Role }) {
    const { tenantId, status, siteType, search, page = 1, limit = 20 } = query;
    const where: Prisma.SiteWhereInput = {};

    // Tenant scoping
    if (user.role !== Role.SUPER_ADMIN) {
      if (user.tenantId) {
        where.tenantId = user.tenantId;
      }
    } else if (tenantId) {
      // SUPER_ADMIN can filter by tenant
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (siteType) {
      where.siteType = siteType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.site.count({ where }),
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

  async findById(id: string, user: { tenantId: string | null; role: Role }) {
    const where: Prisma.SiteWhereInput = { id };

    // Tenant scoping for non-super-admin
    if (user.role !== Role.SUPER_ADMIN) {
      where.tenantId = user.tenantId ?? undefined;
    }

    const site = await this.prisma.site.findFirst({
      where,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return { success: true, data: site };
  }

  async create(dto: CreateSiteDto) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check slug uniqueness within tenant
    const existing = await this.prisma.site.findUnique({
      where: { tenantId_slug: { tenantId: dto.tenantId, slug: dto.slug } },
    });

    if (existing) {
      throw new ConflictException('A site with this slug already exists under this tenant');
    }

    const site = await this.prisma.site.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        slug: dto.slug,
        siteType: dto.siteType ?? 'RESTAURANT',
        cuisine: dto.cuisine ?? [],
        legalEntity: dto.legalEntity,
        taxNumber: dto.taxNumber,
        bankingDetails: (dto.bankingDetails as Prisma.InputJsonValue) ?? undefined,
        address: (dto.address as Prisma.InputJsonValue) ?? undefined,
        timezone: dto.timezone ?? 'UTC',
        phone: dto.phone,
        email: dto.email,
        siteConfig: (dto.siteConfig as Prisma.InputJsonValue) ?? undefined,
        status: 'DRAFT',
      },
    });

    return { success: true, data: site };
  }

  async update(id: string, dto: UpdateSiteDto, user: { tenantId: string | null; role: Role }) {
    const site = await this.findSiteForUser(id, user);

    const updated = await this.prisma.site.update({
      where: { id: site.id },
      data: {
        ...dto,
        bankingDetails: dto.bankingDetails as Prisma.InputJsonValue | undefined,
        address: dto.address as Prisma.InputJsonValue | undefined,
        siteConfig: dto.siteConfig as Prisma.InputJsonValue | undefined,
      },
    });

    return { success: true, data: updated };
  }

  async updateStatus(id: string, dto: SiteStatusDto, user: { tenantId: string | null; role: Role }) {
    const site = await this.findSiteForUser(id, user);

    // Validate status transitions
    const allowedTransitions: Record<SiteStatus, SiteStatus[]> = {
      [SiteStatus.DRAFT]: [SiteStatus.ONBOARDING],
      [SiteStatus.ONBOARDING]: [SiteStatus.LIVE, SiteStatus.DRAFT],
      [SiteStatus.LIVE]: [SiteStatus.SUSPENDED, SiteStatus.CLOSED],
      [SiteStatus.SUSPENDED]: [SiteStatus.LIVE, SiteStatus.CLOSED],
      [SiteStatus.CLOSED]: [SiteStatus.DRAFT],
    };

    const allowed = allowedTransitions[site.status as SiteStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${site.status} to ${dto.status}. Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updateData: Prisma.SiteUpdateInput = { status: dto.status };

    // Auto-set goLiveDate when transitioning to LIVE
    if (dto.status === SiteStatus.LIVE && site.goLiveDate === null) {
      updateData.goLiveDate = new Date();
    }

    const updated = await this.prisma.site.update({
      where: { id: site.id },
      data: updateData,
    });

    return { success: true, data: updated };
  }

  async bulkOnboard(file: Express.Multer.File) {
    const csvContent = file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const header = lines[0]!.toLowerCase().split(',').map((h) => h.trim());
    const expectedHeaders = ['tenantslug', 'name', 'slug', 'sitetype', 'cuisine', 'email', 'phone', 'timezone'];
    const missingHeaders = expectedHeaders.filter((h) => !header.includes(h));

    if (missingHeaders.length > 0) {
      throw new BadRequestException(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
    }

    const results = { created: 0, skipped: 0, errors: [] as Array<{ row: number; message: string }> };

    await this.prisma.$transaction(async (tx) => {
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCsvLine(lines[i]!);
        const row = i + 1;

        try {
          const record: Record<string, string> = {};
          header.forEach((h, idx) => {
            record[h] = values[idx]?.trim() ?? '';
          });

          const tenantSlug = record['tenantslug'];
          const name = record['name'];
          const slug = record['slug'];
          const siteType = (record['sitetype']?.toUpperCase() || 'RESTAURANT') as any;
          const cuisine = record['cuisine'] ? record['cuisine'].split(';').map((c) => c.trim()) : [];
          const email = record['email'] || undefined;
          const phone = record['phone'] || undefined;
          const timezone = record['timezone'] || 'UTC';

          if (!tenantSlug) {
            results.errors.push({ row, message: 'tenantSlug is required' });
            results.skipped++;
            continue;
          }
          if (!name) {
            results.errors.push({ row, message: 'Name is required' });
            results.skipped++;
            continue;
          }
          if (!slug) {
            results.errors.push({ row, message: 'Slug is required' });
            results.skipped++;
            continue;
          }

          // Validate slug format
          if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(slug)) {
            results.errors.push({ row, message: `Invalid slug format: "${slug}"` });
            results.skipped++;
            continue;
          }

          // Resolve tenant
          const tenant = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
          if (!tenant) {
            results.errors.push({ row, message: `Tenant not found for slug: "${tenantSlug}"` });
            results.skipped++;
            continue;
          }

          // Check slug uniqueness within tenant
          const existing = await tx.site.findUnique({
            where: { tenantId_slug: { tenantId: tenant.id, slug } },
          });
          if (existing) {
            results.errors.push({ row, message: `Site slug "${slug}" already exists under tenant "${tenantSlug}"` });
            results.skipped++;
            continue;
          }

          await tx.site.create({
            data: {
              tenantId: tenant.id,
              name,
              slug,
              siteType,
              cuisine,
              email,
              phone,
              timezone,
              status: 'DRAFT',
            },
          });

          results.created++;
        } catch (err: any) {
          results.errors.push({ row, message: err.message || 'Unknown error' });
          results.skipped++;
        }
      }
    });

    return { success: true, data: results };
  }

  async exportCsv(user: { tenantId: string | null; role: Role }): Promise<string> {
    const where: Prisma.SiteWhereInput = {};

    if (user.role !== Role.SUPER_ADMIN && user.tenantId) {
      where.tenantId = user.tenantId;
    }

    const sites = await this.prisma.site.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { slug: true, name: true } },
      },
    });

    const header = 'tenantSlug,tenantName,name,slug,siteType,cuisine,email,phone,timezone,status,goLiveDate';
    const rows = sites.map((s) => {
      const fields = [
        this.csvEscape(s.tenant.slug),
        this.csvEscape(s.tenant.name),
        this.csvEscape(s.name),
        this.csvEscape(s.slug),
        s.siteType,
        this.csvEscape(s.cuisine.join(';')),
        this.csvEscape(s.email ?? ''),
        this.csvEscape(s.phone ?? ''),
        s.timezone,
        s.status,
        s.goLiveDate?.toISOString() ?? '',
      ];
      return fields.join(',');
    });

    return [header, ...rows].join('\n');
  }

  private async findSiteForUser(id: string, user: { tenantId: string | null; role: Role }) {
    const where: Prisma.SiteWhereInput = { id };

    if (user.role !== Role.SUPER_ADMIN) {
      where.tenantId = user.tenantId ?? undefined;
    }

    const site = await this.prisma.site.findFirst({ where });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  async getDashboard(id: string, user: { tenantId: string | null; role: Role }) {
    const site = await this.findSiteForUser(id, user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's order stats
    const todayOrders = await this.prisma.order.findMany({
      where: {
        siteId: site.id,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    const openOrders = todayOrders.filter(
      (o) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status),
    );
    const completedOrders = todayOrders.filter((o) => o.status === 'COMPLETED');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Active shift
    const activeShift = await this.prisma.shift.findFirst({
      where: { siteId: site.id, status: 'OPEN' },
      include: {
        openedBy: { select: { id: true, firstName: true, lastName: true } },
        staffList: true,
      },
    });

    // Table status summary
    const tableStatuses = await this.prisma.table.groupBy({
      by: ['status'],
      where: { siteId: site.id },
      _count: { id: true },
    });

    const tableSummary: Record<string, number> = {
      AVAILABLE: 0,
      OCCUPIED: 0,
      RESERVED: 0,
      DIRTY: 0,
      OUT_OF_SERVICE: 0,
    };
    tableStatuses.forEach((t) => {
      tableSummary[t.status] = t._count.id;
    });

    // Recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        table: { select: { number: true } },
      },
    });

    return {
      success: true,
      data: {
        siteName: site.name,
        siteStatus: site.status,
        today: {
          openOrders: openOrders.length,
          completedOrders: completedOrders.length,
          totalRevenue,
          avgOrderValue,
        },
        activeShift: activeShift
          ? {
              id: activeShift.id,
              openedBy: activeShift.openedBy,
              startedAt: activeShift.startTime,
              openingCash: activeShift.openingCash,
              staffCount: activeShift.staffList.length,
            }
          : null,
        tableSummary,
        recentOrders,
      },
    };
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
