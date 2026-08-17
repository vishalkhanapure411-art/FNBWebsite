import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, FieldReportStatus } from '@omniops/shared';
import {
  CreateFieldReportDto,
  UpdateFieldReportStatusDto,
  AddFieldReportCommentDto,
  ListFieldReportsQueryDto,
} from './dto';

type AuthUser = {
  tenantId: string | null;
  role: Role;
  siteId?: string | null;
  sub?: string;
  id?: string;
};

/**
 * Allowed status transitions for a field report.
 * NEW      → REVIEWED | DISMISSED
 * REVIEWED → ACTIONED | DISMISSED
 * ACTIONED / DISMISSED are terminal.
 */
const VALID_STATUS_TRANSITIONS: Record<FieldReportStatus, FieldReportStatus[]> = {
  [FieldReportStatus.NEW]: [FieldReportStatus.REVIEWED, FieldReportStatus.DISMISSED],
  [FieldReportStatus.REVIEWED]: [FieldReportStatus.ACTIONED, FieldReportStatus.DISMISSED],
  [FieldReportStatus.ACTIONED]: [],
  [FieldReportStatus.DISMISSED]: [],
};

@Injectable()
export class FieldReportsService {
  constructor(private prisma: PrismaService) {}

  private async verifySiteAccess(siteId: string, user: AuthUser) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    if (user.role !== Role.SUPER_ADMIN && site.tenantId !== user.tenantId) {
      throw new ForbiddenException('Site not in your tenant');
    }
    return site;
  }

  private async verifyReportAccess(reportId: string, user: AuthUser) {
    const report = await this.prisma.fieldReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Field report not found');
    if (user.role !== Role.SUPER_ADMIN && report.tenantId !== user.tenantId) {
      throw new ForbiddenException('Field report not in your tenant');
    }
    return report;
  }

  /** The JWT exposes the user id as `sub` (see nestjs-auth-guards skill). */
  private userId(user: AuthUser): string {
    return user.sub ?? user.id ?? '';
  }

  // ══════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════
  async create(dto: CreateFieldReportDto, user: AuthUser) {
    const site = await this.verifySiteAccess(dto.siteId, user);
    const report = await this.prisma.fieldReport.create({
      data: {
        tenantId: site.tenantId,
        siteId: dto.siteId,
        category: dto.category,
        severity: dto.severity,
        title: dto.title,
        description: dto.description,
        status: FieldReportStatus.NEW,
        reportedById: this.userId(user),
      },
      include: {
        site: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return { success: true, data: report };
  }

  // ══════════════════════════════════════════════
  // LIST
  // ══════════════════════════════════════════════
  async list(query: ListFieldReportsQueryDto, user: AuthUser) {
    const where: any = {};
    if (query.siteId) {
      await this.verifySiteAccess(query.siteId, user);
      where.siteId = query.siteId;
    } else if (user.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN without siteId sees all tenants' reports
    } else {
      where.tenantId = user.tenantId;
    }
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.category) where.category = query.category;

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.fieldReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          site: { select: { id: true, name: true } },
          reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      }),
      this.prisma.fieldReport.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total } };
  }

  // ══════════════════════════════════════════════
  // STATUS TRANSITION
  // ══════════════════════════════════════════════
  async updateStatus(id: string, dto: UpdateFieldReportStatusDto, user: AuthUser) {
    const report = await this.verifyReportAccess(id, user);
    const allowed = VALID_STATUS_TRANSITIONS[report.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${report.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    const updated = await this.prisma.fieldReport.update({
      where: { id },
      data: { status: dto.status },
    });
    return { success: true, data: updated };
  }

  // ══════════════════════════════════════════════
  // COMMENTS
  // ══════════════════════════════════════════════
  async addComment(reportId: string, dto: AddFieldReportCommentDto, user: AuthUser) {
    const report = await this.verifyReportAccess(reportId, user);
    const comment = await this.prisma.fieldReportComment.create({
      data: {
        reportId: report.id,
        authorId: this.userId(user),
        body: dto.body,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    return { success: true, data: comment };
  }
}
