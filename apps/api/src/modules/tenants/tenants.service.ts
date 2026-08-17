import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto, TenantStatusDto, QueryTenantsDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryTenantsDto) {
    const { search, status, page = 1, limit = 20 } = query;
    const where: Prisma.TenantWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { sites: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const tenants = data.map(({ _count, ...tenant }) => ({
      ...tenant,
      sitesCount: _count.sites,
    }));

    return {
      success: true,
      data: tenants,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { sites: true } },
        sites: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            siteType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const { _count, ...rest } = tenant;
    return {
      success: true,
      data: {
        ...rest,
        sitesCount: _count.sites,
      },
    };
  }

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('A tenant with this slug already exists');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        legalName: dto.legalName,
        email: dto.email,
        phone: dto.phone,
        taxId: dto.taxId,
        address: (dto.address as Prisma.InputJsonValue) ?? undefined,
        subscriptionTier: dto.subscriptionTier ?? 'FREE',
        featureFlags: (dto.featureFlags as Prisma.InputJsonValue) ?? undefined,
        status: 'ACTIVE',
      },
    });

    return { success: true, data: tenant };
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        address: dto.address as Prisma.InputJsonValue | undefined,
        featureFlags: dto.featureFlags as Prisma.InputJsonValue | undefined,
        themeConfig: dto.themeConfig as Prisma.InputJsonValue | undefined,
      },
    });

    return { success: true, data: updated };
  }

  async updateStatus(id: string, dto: TenantStatusDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (dto.status === 'DELETED') {
      throw new BadRequestException('Use the delete endpoint to remove tenants');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: dto.status },
    });

    return { success: true, data: updated };
  }

  async bulkOnboard(file: Express.Multer.File) {
    const csvContent = file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter((line: string) => line.trim());

    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const header = lines[0]!.toLowerCase().split(',').map((h: string) => h.trim());
    const expectedHeaders = ['name', 'slug', 'legalname', 'email', 'phone', 'subscriptiontier'];
    const missingHeaders = expectedHeaders.filter((h: string) => !header.includes(h));

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
          header.forEach((h: string, idx: number) => {
            record[h] = values[idx]?.trim() ?? '';
          });

          const name: string = record['name']!;
          const slug: string = record['slug']!;
          const legalName: string | undefined = record['legalname'] || undefined;
          const email: string = record['email']!;
          const phone: string | undefined = record['phone'] || undefined;
          const subscriptionTier = (record['subscriptiontier']?.toUpperCase() || 'FREE') as
            | 'FREE'
            | 'STARTER'
            | 'PROFESSIONAL'
            | 'ENTERPRISE';

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
          if (!email) {
            results.errors.push({ row, message: 'Email is required' });
            results.skipped++;
            continue;
          }

          if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(slug)) {
            results.errors.push({ row, message: `Invalid slug format: "${slug}"` });
            results.skipped++;
            continue;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            results.errors.push({ row, message: `Invalid email: "${email}"` });
            results.skipped++;
            continue;
          }

          const existing = await tx.tenant.findUnique({ where: { slug } });
          if (existing) {
            results.errors.push({ row, message: `Slug "${slug}" already exists` });
            results.skipped++;
            continue;
          }

          await tx.tenant.create({
            data: {
              name,
              slug,
              legalName,
              email,
              phone,
              subscriptionTier: subscriptionTier as Prisma.EnumSubscriptionTierFilter['equals'],
              status: 'ACTIVE',
            },
          });

          results.created++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          results.errors.push({ row, message });
          results.skipped++;
        }
      }
    });

    return { success: true, data: results };
  }

  async exportCsv(): Promise<string> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sites: true } },
      },
    });

    const header = 'name,slug,legalName,email,phone,subscriptionTier,status,sitesCount,createdAt';
    const rows = tenants.map((t) => {
      const fields = [
        this.csvEscape(t.name),
        this.csvEscape(t.slug),
        this.csvEscape(t.legalName ?? ''),
        this.csvEscape(t.email),
        this.csvEscape(t.phone ?? ''),
        t.subscriptionTier,
        t.status,
        String(t._count.sites),
        t.createdAt.toISOString(),
      ];
      return fields.join(',');
    });

    return [header, ...rows].join('\n');
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i]!;
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

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
