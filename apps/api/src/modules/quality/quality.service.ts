import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, AuditItemType, AuditStatus, CAPAStatus } from '@omniops/shared';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateItemDto,
  UpdateItemDto,
  StartAuditDto,
  RespondDto,
  AuditStatusDto,
  CreateCapaDto,
  UpdateCapaDto,
  ResolveCapaDto,
} from './dto';

type UserCtx = { tenantId: string | null; role: Role; sub?: string; email?: string };

const VALID_AUDIT_TRANSITIONS: Record<string, string[]> = {
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['REVIEWED', 'CLOSED'],
  REVIEWED: ['CLOSED'],
  CLOSED: [],
};

@Injectable()
export class QualityService {
  constructor(private prisma: PrismaService) {}

  private tenantWhere(user: UserCtx): Record<string, unknown> {
    return user.role === Role.SUPER_ADMIN ? {} : { tenantId: user.tenantId! };
  }

  private async verifyTemplateAccess(templateId: string, user: UserCtx) {
    const template = await this.prisma.auditTemplate.findUnique({ where: { id: templateId } });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  private async verifySiteAccess(siteId: string, user: UserCtx) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site || (user.role !== Role.SUPER_ADMIN && site.tenantId !== user.tenantId)) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  private async verifyAuditAccess(auditId: string, user: UserCtx) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit || (user.role !== Role.SUPER_ADMIN && audit.tenantId !== user.tenantId)) {
      throw new NotFoundException('Audit not found');
    }
    return audit;
  }

  private async verifyCapaAccess(capaId: string, user: UserCtx) {
    const capa = await this.prisma.cAPA.findUnique({
      where: { id: capaId },
      include: { audit: { select: { tenantId: true } } },
    });
    if (!capa || (user.role !== Role.SUPER_ADMIN && capa.audit.tenantId !== user.tenantId)) {
      throw new NotFoundException('CAPA not found');
    }
    return capa;
  }

  // ══════════════════════════════════════════════
  // TEMPLATES
  // ══════════════════════════════════════════════
  async listTemplates(user: UserCtx) {
    const templates = await this.prisma.auditTemplate.findMany({
      where: { ...this.tenantWhere(user), isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sections: true } },
        sections: {
          orderBy: { sortOrder: 'asc' },
          select: { _count: { select: { items: true } }, id: true },
        },
      },
    });
    const data = templates.map((t) => ({
      ...t,
      itemCount: t.sections.reduce((acc, s) => acc + s._count.items, 0),
      sectionCount: t._count.sections,
      sections: undefined,
      _count: undefined,
    }));
    return { success: true, data };
  }

  async getTemplate(id: string, user: UserCtx) {
    const template = await this.prisma.auditTemplate.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    return { success: true, data: template };
  }

  async createTemplate(dto: CreateTemplateDto, user: UserCtx) {
    if (!user.tenantId) {
      throw new BadRequestException('User must belong to a tenant to create templates');
    }
    const template = await this.prisma.auditTemplate.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
      },
    });
    return { success: true, data: template };
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, user: UserCtx) {
    await this.verifyTemplateAccess(id, user);
    const template = await this.prisma.auditTemplate.update({ where: { id }, data: dto });
    return { success: true, data: template };
  }

  async deleteTemplate(id: string, user: UserCtx) {
    await this.verifyTemplateAccess(id, user);
    const template = await this.prisma.auditTemplate.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true, data: template };
  }

  // ══════════════════════════════════════════════
  // SECTIONS
  // ══════════════════════════════════════════════
  async addSection(templateId: string, dto: CreateSectionDto, user: UserCtx) {
    await this.verifyTemplateAccess(templateId, user);
    const maxOrder = await this.prisma.auditSection.aggregate({
      where: { templateId },
      _max: { sortOrder: true },
    });
    const section = await this.prisma.auditSection.create({
      data: {
        templateId,
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return { success: true, data: section };
  }

  async updateSection(id: string, dto: UpdateSectionDto, user: UserCtx) {
    const section = await this.prisma.auditSection.findUnique({
      where: { id },
      include: { template: { select: { tenantId: true } } },
    });
    if (!section || (user.role !== Role.SUPER_ADMIN && section.template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Section not found');
    }
    const updated = await this.prisma.auditSection.update({ where: { id }, data: dto });
    return { success: true, data: updated };
  }

  async deleteSection(id: string, user: UserCtx) {
    const section = await this.prisma.auditSection.findUnique({
      where: { id },
      include: { template: { select: { tenantId: true } } },
    });
    if (!section || (user.role !== Role.SUPER_ADMIN && section.template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Section not found');
    }
    await this.prisma.auditSection.delete({ where: { id } });
    return { success: true, data: { id } };
  }

  // ══════════════════════════════════════════════
  // ITEMS
  // ══════════════════════════════════════════════
  async addItem(sectionId: string, dto: CreateItemDto, user: UserCtx) {
    const section = await this.prisma.auditSection.findUnique({
      where: { id: sectionId },
      include: { template: { select: { tenantId: true } } },
    });
    if (!section || (user.role !== Role.SUPER_ADMIN && section.template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Section not found');
    }
    const maxOrder = await this.prisma.auditItem.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    const item = await this.prisma.auditItem.create({
      data: {
        sectionId,
        question: dto.question,
        description: dto.description,
        itemType: dto.itemType as AuditItemType,
        required: dto.required ?? true,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return { success: true, data: item };
  }

  async updateItem(id: string, dto: UpdateItemDto, user: UserCtx) {
    const item = await this.prisma.auditItem.findUnique({
      where: { id },
      include: { section: { include: { template: { select: { tenantId: true } } } } },
    });
    if (!item || (user.role !== Role.SUPER_ADMIN && item.section.template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Item not found');
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.itemType) data.itemType = dto.itemType as AuditItemType;
    const updated = await this.prisma.auditItem.update({ where: { id }, data });
    return { success: true, data: updated };
  }

  async deleteItem(id: string, user: UserCtx) {
    const item = await this.prisma.auditItem.findUnique({
      where: { id },
      include: { section: { include: { template: { select: { tenantId: true } } } } },
    });
    if (!item || (user.role !== Role.SUPER_ADMIN && item.section.template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Item not found');
    }
    await this.prisma.auditItem.delete({ where: { id } });
    return { success: true, data: { id } };
  }

  // ══════════════════════════════════════════════
  // AUDITS
  // ══════════════════════════════════════════════
  async startAudit(dto: StartAuditDto, user: UserCtx) {
    await this.verifySiteAccess(dto.siteId, user);
    const template = await this.prisma.auditTemplate.findUnique({
      where: { id: dto.templateId },
      include: {
        sections: { include: { items: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!template || (user.role !== Role.SUPER_ADMIN && template.tenantId !== user.tenantId)) {
      throw new NotFoundException('Template not found');
    }
    if (!template.isActive) throw new BadRequestException('Template is not active');
    const tenantId = user.role === Role.SUPER_ADMIN ? template.tenantId : user.tenantId!;
    const items = template.sections.flatMap((s) => s.items);
    const audit = await this.prisma.audit.create({
      data: {
        tenantId,
        siteId: dto.siteId,
        templateId: dto.templateId,
        title: dto.title,
        auditorId: user.sub ?? '',
        responses: {
          create: items.map((item) => ({ itemId: item.id, value: '' })),
        },
      },
      include: {
        template: { select: { id: true, name: true, category: true } },
        site: { select: { id: true, name: true } },
        auditor: { select: { id: true, firstName: true, lastName: true } },
        responses: { include: { item: { include: { section: { select: { id: true, title: true } } } } } },
      },
    });
    return { success: true, data: audit };
  }

  async listAudits(
    user: UserCtx,
    filters?: { siteId?: string; status?: string; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const where: Record<string, unknown> = this.tenantWhere(user);
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      const startedAt: Record<string, Date> = {};
      if (filters.from) startedAt.gte = new Date(filters.from);
      if (filters.to) startedAt.lte = new Date(filters.to);
      where.startedAt = startedAt;
    }
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const [data, total] = await Promise.all([
      this.prisma.audit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          template: { select: { id: true, name: true, category: true } },
          site: { select: { id: true, name: true } },
          auditor: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { responses: true, capas: true } },
        },
      }),
      this.prisma.audit.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total } };
  }

  async getAudit(id: string, user: UserCtx) {
    const audit = await this.prisma.audit.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            sections: {
              orderBy: { sortOrder: 'asc' },
              include: { items: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
        site: { select: { id: true, name: true } },
        auditor: { select: { id: true, firstName: true, lastName: true, email: true } },
        responses: { include: { item: { include: { section: { select: { id: true, title: true } } } } } },
        capas: {
          orderBy: { createdAt: 'desc' },
          include: { assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
    if (!audit || (user.role !== Role.SUPER_ADMIN && audit.tenantId !== user.tenantId)) {
      throw new NotFoundException('Audit not found');
    }
    return { success: true, data: audit };
  }

  async respond(auditId: string, dto: RespondDto, user: UserCtx) {
    const audit = await this.verifyAuditAccess(auditId, user);
    if (audit.status !== AuditStatus.IN_PROGRESS) {
      throw new BadRequestException('Can only respond to an audit that is IN_PROGRESS');
    }
    const response = await this.prisma.auditResponse.upsert({
      where: { auditId_itemId: { auditId, itemId: dto.itemId } },
      create: {
        auditId,
        itemId: dto.itemId,
        value: dto.value,
        notes: dto.notes,
        photoUrl: dto.photoUrl,
      },
      update: {
        value: dto.value,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
      },
    });
    return { success: true, data: response };
  }

  private scoreResponse(itemType: string, value: string): { earned: number; max: number } | null {
    const v = value?.trim().toLowerCase();
    switch (itemType) {
      case AuditItemType.PASS_FAIL:
        return { earned: v === 'pass' ? 1 : 0, max: 1 };
      case AuditItemType.YES_NO:
        return { earned: v === 'yes' ? 1 : 0, max: 1 };
      case AuditItemType.SCORE_1_5: {
        const n = Number(value);
        if (Number.isNaN(n) || n < 1 || n > 5) return null;
        return { earned: n / 5, max: 1 };
      }
      // TEMPERATURE and PHOTO_REQUIRED are observational — excluded from scoring
      default:
        return null;
    }
  }

  async complete(auditId: string, user: UserCtx) {
    const audit = await this.verifyAuditAccess(auditId, user);
    if (audit.status !== AuditStatus.IN_PROGRESS) {
      throw new BadRequestException('Audit is not in progress');
    }
    const responses = await this.prisma.auditResponse.findMany({
      where: { auditId, value: { not: '' } },
      include: { item: { select: { itemType: true } } },
    });
    let earned = 0;
    let max = 0;
    const answeredIds = new Set<string>();
    for (const r of responses) {
      const s = this.scoreResponse(r.item.itemType, r.value);
      if (s === null) continue;
      earned += s.earned;
      max += s.max;
      answeredIds.add(r.id);
    }
    // Unanswered scorable items still count toward max (deduct marks)
    const scorableTypes = [AuditItemType.PASS_FAIL, AuditItemType.YES_NO, AuditItemType.SCORE_1_5];
    const scorableItems = await this.prisma.auditItem.count({
      where: {
        section: { templateId: audit.templateId },
        itemType: { in: scorableTypes },
      },
    });
    const answeredScorable = responses.filter((r) => answeredIds.has(r.id)).length;
    max += Math.max(0, scorableItems - answeredScorable);
    const score = max > 0 ? Math.round((earned / max) * 1000) / 10 : null;
    const updated = await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: AuditStatus.COMPLETED,
        score,
        maxScore: max,
        completedAt: new Date(),
      },
    });
    return { success: true, data: updated };
  }

  async updateStatus(auditId: string, dto: AuditStatusDto, user: UserCtx) {
    const audit = await this.verifyAuditAccess(auditId, user);
    const target = dto.status as AuditStatus;
    if (![AuditStatus.REVIEWED, AuditStatus.CLOSED].includes(target)) {
      throw new BadRequestException('Status can only transition to REVIEWED or CLOSED');
    }
    const allowed = VALID_AUDIT_TRANSITIONS[audit.status] ?? [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(`Cannot transition audit from ${audit.status} to ${target}`);
    }
    const updated = await this.prisma.audit.update({
      where: { id: auditId },
      data: { status: target },
    });
    return { success: true, data: updated };
  }

  // ══════════════════════════════════════════════
  // CAPA
  // ══════════════════════════════════════════════
  async createCapa(auditId: string, dto: CreateCapaDto, user: UserCtx) {
    await this.verifyAuditAccess(auditId, user);
    const capa = await this.prisma.cAPA.create({
      data: {
        auditId,
        title: dto.title,
        description: dto.description,
        assignedToId: dto.assignedToId,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return { success: true, data: capa };
  }

  async listCapas(
    user: UserCtx,
    filters?: { status?: string; assignedToId?: string; siteId?: string; page?: number; limit?: number },
  ) {
    const where: Record<string, unknown> = {
      audit: {
        ...(user.role === Role.SUPER_ADMIN ? {} : { tenantId: user.tenantId! }),
        ...(filters?.siteId ? { siteId: filters.siteId } : {}),
      },
    };
    if (filters?.status) where.status = filters.status;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const [data, total] = await Promise.all([
      this.prisma.cAPA.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          audit: {
            select: { id: true, title: true, siteId: true, site: { select: { id: true, name: true } } },
          },
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.cAPA.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total } };
  }

  async updateCapa(id: string, dto: UpdateCapaDto, user: UserCtx) {
    await this.verifyCapaAccess(id, user);
    const data: Record<string, unknown> = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    const capa = await this.prisma.cAPA.update({ where: { id }, data });
    return { success: true, data: capa };
  }

  async resolveCapa(id: string, dto: ResolveCapaDto, user: UserCtx) {
    const capa = await this.verifyCapaAccess(id, user);
    if (capa.status === CAPAStatus.RESOLVED || capa.status === CAPAStatus.VERIFIED) {
      throw new BadRequestException('CAPA is already resolved');
    }
    const updated = await this.prisma.cAPA.update({
      where: { id },
      data: { resolution: dto.resolution, resolvedAt: new Date(), status: CAPAStatus.RESOLVED },
    });
    return { success: true, data: updated };
  }

  async verifyCapa(id: string, user: UserCtx) {
    const capa = await this.verifyCapaAccess(id, user);
    if (capa.status !== CAPAStatus.RESOLVED) {
      throw new BadRequestException('CAPA must be RESOLVED before it can be verified');
    }
    const updated = await this.prisma.cAPA.update({
      where: { id },
      data: { status: CAPAStatus.VERIFIED },
    });
    return { success: true, data: updated };
  }
}
