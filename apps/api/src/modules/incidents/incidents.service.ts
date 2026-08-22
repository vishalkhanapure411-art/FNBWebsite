import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  Role,
  IncidentDepartment,
  IncidentSeverity,
  IncidentStatus,
} from '@omniops/shared';
import {
  CreateIncidentDto,
  UpdateIncidentStatusDto,
  AddIncidentCommentDto,
  ListIncidentsQueryDto,
} from './dto';

type AuthUser = {
  tenantId: string | null;
  role: Role;
  siteId?: string | null;
  sub?: string;
  id?: string;
};

/**
 * Role → department mapping. Each assurance department user answers to exactly
 * ONE department in the unified engine. FRANCHISE_OWNER / BRAND_MANAGER / tenant
 * admins / SUPER_ADMIN get no department (read-all instead).
 */
const DEPT_BY_ROLE: Partial<Record<Role, IncidentDepartment>> = {
  [Role.QUALITY_AUDITOR]: IncidentDepartment.QA,
  [Role.REVENUE_ASSURANCE]: IncidentDepartment.RA,
  [Role.MAINTENANCE_ASSURANCE]: IncidentDepartment.MAINTENANCE,
  [Role.CONTROLS]: IncidentDepartment.CONTROLS,
};

/** Roles that can read across ALL departments (management read-only). */
const READ_ALL_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.BRAND_MANAGER,
  Role.FRANCHISE_OWNER,
  Role.OPERATIONS_MANAGER,
  Role.FINANCE_MANAGER,
];

/** SLA: severity → dueAt offset in days  (L/M/H/C = 7/3/2/1). */
const SLA_DAYS: Record<IncidentSeverity, number> = {
  [IncidentSeverity.LOW]: 7,
  [IncidentSeverity.MEDIUM]: 3,
  [IncidentSeverity.HIGH]: 2,
  [IncidentSeverity.CRITICAL]: 1,
};

/** Ticket-number prefix per department (e.g. QA-2026-0001). */
const TICKET_PREFIX: Record<IncidentDepartment, string> = {
  [IncidentDepartment.QA]: 'QA',
  [IncidentDepartment.RA]: 'RA',
  [IncidentDepartment.MAINTENANCE]: 'MNT',
  [IncidentDepartment.CONTROLS]: 'CTL',
};

const VALID_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [
    IncidentStatus.ASSIGNED,
    IncidentStatus.IN_PROGRESS,
    IncidentStatus.RESOLVED,
    IncidentStatus.CLOSED,
  ],
  [IncidentStatus.ASSIGNED]: [
    IncidentStatus.IN_PROGRESS,
    IncidentStatus.RESOLVED,
    IncidentStatus.CLOSED,
  ],
  [IncidentStatus.IN_PROGRESS]: [
    IncidentStatus.RESOLVED,
    IncidentStatus.CLOSED,
  ],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED],
  [IncidentStatus.CLOSED]: [],
};

const TICKET_INCLUDE = {
  site: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  categoryLevel1: { select: { id: true, name: true } },
  categoryLevel2: { select: { id: true, name: true } },
  categoryLevel3: { select: { id: true, name: true } },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  },
};

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  private deptOf(user: AuthUser): IncidentDepartment | undefined {
    return DEPT_BY_ROLE[user.role];
  }

  private isReadAll(user: AuthUser): boolean {
    return READ_ALL_ROLES.includes(user.role);
  }

  /** The JWT exposes the user id as `sub` (see nestjs-auth-guards skill). */
  private userId(user: AuthUser): string {
    return user.sub ?? user.id ?? '';
  }

  private async nextTicketNumber(tenantId: string, department: IncidentDepartment) {
    const year = new Date().getFullYear();
    const prefix = TICKET_PREFIX[department];
    const existing = await this.prisma.incidentTicket.count({
      where: {
        tenantId,
        department,
        ticketNumber: { startsWith: `${prefix}-${year}-` },
      },
    });
    return `${prefix}-${year}-${String(existing + 1).padStart(4, '0')}`;
  }

  private slaDueAt(severity: IncidentSeverity): Date {
    const days = SLA_DAYS[severity] ?? SLA_DAYS[IncidentSeverity.MEDIUM];
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  private async verifySite(siteId: string, user: AuthUser) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    if (user.role !== Role.SUPER_ADMIN && site.tenantId !== user.tenantId) {
      throw new ForbiddenException('Site not in your tenant');
    }
    return site;
  }

  // ─────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────
  async create(dto: CreateIncidentDto, user: AuthUser) {
    const dept = this.deptOf(user);
    if (!dept) {
      throw new ForbiddenException('Your role cannot create incident tickets (management is read-only)');
    }
    // Department user cannot pick another department.
    if (dto.department !== dept) {
      throw new ForbiddenException(`You may only create ${dept} tickets (requested ${dto.department})`);
    }
    // Resolve target site. Default to user's own site for site-scoped users.
    let siteId = dto.siteId ?? user.siteId ?? null;
    let tenantId = user.tenantId;
    if (siteId) {
      const site = await this.verifySite(siteId, user);
      // Site-scoped user cannot pick another site.
      if (user.siteId && user.siteId !== siteId) {
        throw new ForbiddenException('You may only create tickets for your own site');
      }
      tenantId = site.tenantId;
    }
    if (!tenantId) {
      throw new ForbiddenException('Unable to resolve tenant for ticket');
    }

    const severity = dto.severity ?? IncidentSeverity.MEDIUM;
    const ticketNumber = await this.nextTicketNumber(tenantId, dto.department);

    // Validate category FKs belong to same tenant + department + expected level.
    if (dto.categoryLevel1Id) await this.verifyCategory(dto.categoryLevel1Id, tenantId, dto.department, 1, user);
    if (dto.categoryLevel2Id) await this.verifyCategory(dto.categoryLevel2Id, tenantId, dto.department, 2, user);
    if (dto.categoryLevel3Id) await this.verifyCategory(dto.categoryLevel3Id, tenantId, dto.department, 3, user);

    const ticket = await this.prisma.incidentTicket.create({
      data: {
        ticketNumber,
        tenantId,
        siteId,
        department: dto.department,
        categoryLevel1Id: dto.categoryLevel1Id ?? null,
        categoryLevel2Id: dto.categoryLevel2Id ?? null,
        categoryLevel3Id: dto.categoryLevel3Id ?? null,
        title: dto.title,
        description: dto.description,
        severity,
        status: IncidentStatus.OPEN,
        assignedToId: dto.assignedToId ?? null,
        createdById: this.userId(user),
        dueAt: this.slaDueAt(severity),
        comments: {
          create: {
            authorId: this.userId(user),
            text: 'Ticket opened',
          },
        },
      },
      include: TICKET_INCLUDE,
    });
    return { success: true, data: ticket };
  }

  private async verifyCategory(
    id: string,
    tenantId: string,
    department: IncidentDepartment,
    level: number,
    user: AuthUser,
  ) {
    const cat = await this.prisma.incidentCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Incident category not found');
    if (cat.tenantId !== tenantId || cat.department !== department || cat.level !== level) {
      throw new BadRequestException('Incident category does not match tenant/department/level');
    }
    return cat;
  }

  // ─────────────────────────────────────────────────
  // ACCESS / RLS helpers
  // ─────────────────────────────────────────────────
  /** Builds the RLS `where` clause for a viewer (tenant isolation + dept/site scoping). */
  private buildReadWhere(user: AuthUser, query: ListIncidentsQueryDto): { where: any; sawAll: boolean } {
    const dept = this.deptOf(user);
    const readAll = this.isReadAll(user);
    const where: any = {};

    if (user.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN sees everything across all tenants (unless a site filters).
      if (query.siteId) where.siteId = query.siteId;
      if (query.scope === 'all') {
        // all departments
      } else if (query.department) {
        where.department = query.department;
      }
      if (query.status) where.status = query.status;
      if (query.severity) where.severity = query.severity;
      return { where, sawAll: true };
    }

    // Every other role is tenant-scoped.
    where.tenantId = user.tenantId;
    if (!where.tenantId) throw new ForbiddenException('No tenant scope');

    if (readAll) {
      // Management read-only: sees ALL departments (all sites in tenant) by default.
      if (query.siteId) {
        // a read-all user may filter to a specific site (validated implicitly by tenant)
        where.siteId = query.siteId;
      }
      return { where, sawAll: true };
    }

    // Department user.
    if (!dept) throw new ForbiddenException('No department scope');
    where.department = dept;
    if (query.department && query.department !== dept) {
      throw new ForbiddenException('Cannot view another department\'s tickets');
    }
    if (user.siteId) {
      // Site-scoped: own site only (may not request another site).
      if (query.siteId && query.siteId !== user.siteId) {
        throw new ForbiddenException('Cannot view another site\'s tickets');
      }
      where.siteId = user.siteId;
    } else if (query.siteId) {
      // Central dept user: may filter to any site in their tenant.
      where.siteId = query.siteId;
    }
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    return { where, sawAll: false };
  }

  private async verifyTicketVisible(ticketId: string, user: AuthUser) {
    const ticket = await this.prisma.incidentTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Incident ticket not found');
    const readable = await this.canView(ticket, user);
    if (!readable) throw new NotFoundException('Incident ticket not found');
    return ticket;
  }

  private async canView(ticket: { tenantId: string; siteId: string | null; department: string }, user: AuthUser) {
    if (user.role === Role.SUPER_ADMIN) return true;
    if (ticket.tenantId !== user.tenantId) return false;
    if (this.isReadAll(user)) return true;
    const dept = this.deptOf(user);
    if (!dept || ticket.department !== dept) return false;
    // Site-scoped dept user only within their own site.
    if (user.siteId && ticket.siteId && ticket.siteId !== user.siteId) return false;
    return true;
  }

  // ─────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────
  async list(query: ListIncidentsQueryDto, user: AuthUser) {
    const { where } = this.buildReadWhere(user, query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.incidentTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: TICKET_INCLUDE,
      }),
      this.prisma.incidentTicket.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total } };
  }

  // ─────────────────────────────────────────────────
  // GET BY ID
  // ─────────────────────────────────────────────────
  async findOne(id: string, user: AuthUser) {
    const ticket = await this.verifyTicketVisible(id, user);
    const full = await this.prisma.incidentTicket.findUnique({
      where: { id: ticket.id },
      include: TICKET_INCLUDE,
    });
    return { success: true, data: full };
  }

  // ─────────────────────────────────────────────────
  // STATUS TRANSITION
  // ─────────────────────────────────────────────────
  async updateStatus(id: string, dto: UpdateIncidentStatusDto, user: AuthUser) {
    const ticket = await this.verifyTicketVisible(id, user);
    const dept = this.deptOf(user);
    if (!dept) {
      throw new ForbiddenException('Management roles are read-only');
    }
    if (ticket.department !== dept) {
      throw new ForbiddenException('Cannot update another department\'s ticket');
    }
    // Site-scoped user may only update own-site tickets.
    if (user.siteId && ticket.siteId && ticket.siteId !== user.siteId) {
      throw new ForbiddenException('Cannot update another site\'s ticket');
    }
    const allowed = VALID_STATUS_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${ticket.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    const data: Record<string, any> = {
      status: dto.status,
      comments: {
        create: {
          authorId: this.userId(user),
          text: `Status changed to ${dto.status}`,
        },
      },
    };
    if (dto.status === IncidentStatus.RESOLVED) data.resolvedAt = new Date();
    if (dto.status === IncidentStatus.CLOSED) data.closedAt = new Date();
    const updated = await this.prisma.incidentTicket.update({
      where: { id: ticket.id },
      data,
      include: TICKET_INCLUDE,
    });
    return { success: true, data: updated };
  }

  // ─────────────────────────────────────────────────
  // COMMENTS
  // ─────────────────────────────────────────────────
  async addComment(ticketId: string, dto: AddIncidentCommentDto, user: AuthUser) {
    const ticket = await this.verifyTicketVisible(ticketId, user);
    const dept = this.deptOf(user);
    if (!dept) {
      throw new ForbiddenException('Management roles are read-only');
    }
    if (ticket.department !== dept) {
      throw new ForbiddenException('Cannot comment on another department\'s ticket');
    }
    if (user.siteId && ticket.siteId && ticket.siteId !== user.siteId) {
      throw new ForbiddenException('Cannot comment on another site\'s ticket');
    }
    const comment = await this.prisma.incidentTicketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: this.userId(user),
        text: dto.text,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    return { success: true, data: comment };
  }

  // ─────────────────────────────────────────────────
  // CATEGORIES (3-level tree, read-only)
  // ─────────────────────────────────────────────────
  async getCategories(department: IncidentDepartment, user: AuthUser) {
    const dept = this.deptOf(user);
    if (!dept && !this.isReadAll(user)) {
      throw new ForbiddenException('No department access');
    }
    // Any assurance/management user may read any department's taxonomy (READ-only).
    const where: any = { department };
    if (user.tenantId) where.tenantId = user.tenantId;
    const all = await this.prisma.incidentCategory.findMany({
      where,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    const byParent = new Map<string | null, any[]>();
    for (const c of all) {
      const k = c.parentId;
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push({ id: c.id, name: c.name, level: c.level, children: [] });
    }
    const attach = (node: any) => {
      node.children = byParent.get(node.id) ?? [];
      node.children.forEach(attach);
      return node;
    };
    const roots = (byParent.get(null) ?? []).map(attach);
    return { success: true, data: roots };
  }
}
