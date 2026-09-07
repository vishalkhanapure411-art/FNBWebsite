import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@omniops/shared';
import { Prisma, MenuPlanStatus, IndentStatus, IngredientUnit } from '@prisma/client';
import {
  CreateMenuPlanDto,
  UpdateMenuPlanDto,
  ReplacePlanItemsDto,
  PlansQueryDto,
  CreateIndentDto,
  IndentsQueryDto,
} from './dto';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; sub: string };

@Injectable()
export class CulinaryService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────
  // Access helpers (tenant isolation + site-scoped CULINARY lock —
  // site-scoped CULINARY may only touch their own site)
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
    // Site-scoped users (CULINARY or otherwise) may only access their own site.
    if (user.siteId && user.role !== Role.SUPER_ADMIN && site.id !== user.siteId) {
      throw new ForbiddenException('You do not have access to this site');
    }
    return site;
  }

  private round3(n: number): number {
    return Math.round(n * 1000) / 1000;
  }

  // ──────────────────────────────────────────────────────────────
  // Menu plans
  // ──────────────────────────────────────────────────────────────

  async createPlan(dto: CreateMenuPlanDto, user: AuthUser) {
    const tenantId = await this.resolveTenant(user, dto.siteId);
    let siteId: string | undefined;
    if (dto.siteId) {
      const site = await this.resolveSiteContext(dto.siteId, user);
      siteId = site.id;
    } else if (user.siteId) {
      // Site-scoped CULINARY implicitly plans for their own site.
      const site = await this.resolveSiteContext(user.siteId, user);
      siteId = site.id;
    }
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start >= end) throw new BadRequestException('startDate must be before endDate');
    const plan = await this.prisma.menuPlan.create({
      data: {
        tenantId,
        siteId: siteId ?? null,
        name: dto.name,
        startDate: start,
        endDate: end,
        notes: dto.notes ?? null,
        status: MenuPlanStatus.DRAFT,
        createdById: user.sub ?? null,
      },
      include: { items: { include: { menuItem: { select: { id: true, name: true, price: true } } } } },
    });
    return { success: true, data: plan };
  }

  async listPlans(query: PlansQueryDto, user: AuthUser) {
    if (!user.tenantId) throw new ForbiddenException('No tenant scope');
    const where: Prisma.MenuPlanWhereInput = { tenantId: user.tenantId };
    if (query.status) where.status = query.status as MenuPlanStatus;
    if (query.siteId) {
      await this.resolveSiteContext(query.siteId, user);
      where.siteId = query.siteId;
    } else if (user.siteId && user.role !== Role.SUPER_ADMIN) {
      // Site-scoped users see only their own site's plans.
      where.siteId = user.siteId;
    }
    const plans = await this.prisma.menuPlan.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true } } } },
        _count: { select: { indents: true } },
      },
    });
    return { success: true, data: plans };
  }

  async getPlan(id: string, user: AuthUser) {
    const plan = await this.findPlan(id, user);
    return { success: true, data: plan };
  }

  async updatePlan(id: string, dto: UpdateMenuPlanDto, user: AuthUser) {
    const existing = await this.findPlan(id, user);
    const data: Prisma.MenuPlanUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const start = dto.startDate ? new Date(dto.startDate) : existing.startDate;
      const end = dto.endDate ? new Date(dto.endDate) : existing.endDate;
      if (start >= end) throw new BadRequestException('startDate must be before endDate');
      data.startDate = start;
      data.endDate = end;
    }
    if (dto.status !== undefined) {
      const next = dto.status as MenuPlanStatus;
      this.assertStatusTransition(existing.status, next);
      data.status = next;
    }
    const plan = await this.prisma.menuPlan.update({
      where: { id: existing.id },
      data,
      include: { items: { include: { menuItem: { select: { id: true, name: true, price: true } } } } },
    });
    return { success: true, data: plan };
  }

  async replacePlanItems(id: string, dto: ReplacePlanItemsDto, user: AuthUser) {
    const plan = await this.findPlan(id, user);
    if (plan.status !== MenuPlanStatus.DRAFT) {
      throw new BadRequestException('Items can only be replaced while the plan is DRAFT');
    }
    // Validate every menu item exists and belongs to the plan's tenant.
    const menuItemIds = Array.from(new Set(dto.items.map((i) => i.menuItemId)));
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, menu: { tenantId: plan.tenantId } },
      select: { id: true },
    });
    const found = new Set(menuItems.map((m) => m.id));
    for (const id of menuItemIds) {
      if (!found.has(id)) {
        throw new BadRequestException(`Menu item ${id} not found in the plan's tenant`);
      }
    }
    // Upsert semantics: replace all items with the provided list.
    await this.prisma.$transaction([
      this.prisma.menuPlanItem.deleteMany({ where: { menuPlanId: plan.id } }),
      this.prisma.menuPlanItem.createMany({
        data: dto.items.map((i) => ({
          menuPlanId: plan.id,
          menuItemId: i.menuItemId,
          dayIndex: i.dayIndex ?? 0,
          mealSlot: i.mealSlot ?? 'ALL_DAY',
          plannedQty: i.plannedQty ?? 1,
        })),
      }),
    ]);
    const updated = await this.prisma.menuPlan.findUnique({
      where: { id: plan.id },
      include: { items: { include: { menuItem: { select: { id: true, name: true, price: true } } } } },
    });
    return { success: true, data: updated };
  }

  async deletePlan(id: string, user: AuthUser) {
    const plan = await this.findPlan(id, user);
    const indentCount = await this.prisma.indent.count({ where: { menuPlanId: plan.id } });
    if (plan.status !== MenuPlanStatus.DRAFT && indentCount > 0) {
      throw new BadRequestException(
        'Only DRAFT plans with no indents can be deleted (archive the plan instead)',
      );
    }
    if (indentCount > 0) {
      throw new BadRequestException('Plan has indents and cannot be deleted (archive it instead)');
    }
    if (plan.status !== MenuPlanStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT plans can be deleted (archive the plan instead)');
    }
    await this.prisma.menuPlan.delete({ where: { id: plan.id } });
    return { success: true, data: { id: plan.id, deleted: true } };
  }

  private async findPlan(id: string, user: AuthUser) {
    const where: Prisma.MenuPlanWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const plan = await this.prisma.menuPlan.findFirst({
      where,
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, price: true } } } },
        _count: { select: { indents: true } },
      },
    });
    if (!plan) throw new NotFoundException('Menu plan not found');
    if (plan.siteId && user.siteId && user.role !== Role.SUPER_ADMIN && plan.siteId !== user.siteId) {
      throw new ForbiddenException('You do not have access to this menu plan');
    }
    return plan;
  }

  private assertStatusTransition(current: MenuPlanStatus, next: MenuPlanStatus) {
    const allowed: Record<MenuPlanStatus, MenuPlanStatus[]> = {
      [MenuPlanStatus.DRAFT]: [MenuPlanStatus.ACTIVE, MenuPlanStatus.ARCHIVED],
      [MenuPlanStatus.ACTIVE]: [MenuPlanStatus.DRAFT, MenuPlanStatus.ARCHIVED],
      [MenuPlanStatus.ARCHIVED]: [],
    };
    if (current === next) return;
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Invalid plan status transition: ${current} -> ${next}`);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Indents
  // ──────────────────────────────────────────────────────────────

  async createIndent(dto: CreateIndentDto, user: AuthUser) {
    const plan = await this.findPlan(dto.menuPlanId, user);
    // DRAFT plans are allowed as a working state; indents raised from
    // ARCHIVED plans are blocked.
    if (plan.status === MenuPlanStatus.ARCHIVED) {
      throw new BadRequestException('Cannot raise an indent from an ARCHIVED menu plan');
    }
    // Resolve site: explicit siteId > plan.siteId > user.siteId.
    let siteId: string | undefined;
    if (dto.siteId) {
      const site = await this.resolveSiteContext(dto.siteId, user);
      siteId = site.id;
    }
    if (!siteId && plan.siteId) {
      const site = await this.resolveSiteContext(plan.siteId, user);
      siteId = site.id;
    }
    if (!siteId && user.siteId) {
      const site = await this.resolveSiteContext(user.siteId, user);
      siteId = site.id;
    }

    const { lines, uncostedMenuItems, distinctIngredients, menuItemsWithoutRecipe } =
      await this.computeIndentLines(plan.id, plan.tenantId);

    const label = dto.label ?? `Indent — ${plan.name}`;
    const indent = await this.prisma.$transaction(async (tx) => {
      const created = await tx.indent.create({
        data: {
          tenantId: plan.tenantId,
          siteId: siteId ?? null,
          menuPlanId: plan.id,
          label,
          status: IndentStatus.DRAFT,
          notes: dto.notes ?? null,
          raisedById: user.sub ?? null,
        },
      });
      if (lines.length > 0) {
        await tx.indentLine.createMany({
          data: lines.map((l) => ({
            indentId: created.id,
            ingredientId: l.ingredientId,
            requiredQty: l.requiredQty,
            unit: l.unit,
          })),
        });
      }
      return tx.indent.findUniqueOrThrow({
        where: { id: created.id },
        include: { lines: { include: { ingredient: { select: { id: true, name: true, unit: true } } } } },
      });
    });

    return {
      success: true,
      data: {
        indent,
        computation: {
          distinctIngredients,
          menuItemsWithoutRecipe,
          uncostedMenuItems,
        },
      },
    };
  }

  /** Compute required ingredient quantities from a plan's items.
   *  For each plan item: use the menu item's ACTIVE recipe (latest active
   *  version). per-serve qty = line.qty / recipe.yieldQty, then × plannedQty.
   *  Summed per ingredient; items without an active recipe are reported in
   *  `uncostedMenuItems` and their lines skipped (no fabricated quantities). */
  private async computeIndentLines(menuPlanId: string, tenantId: string) {
    const items = await this.prisma.menuPlanItem.findMany({
      where: { menuPlanId },
      include: { menuItem: { select: { id: true, name: true } } },
    });
    const menuItemIds = Array.from(new Set(items.map((i) => i.menuItemId)));
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId, menuItemId: { in: menuItemIds }, active: true },
      orderBy: { version: 'desc' },
      include: { lines: { include: { ingredient: { select: { id: true, unit: true } } } } },
    });
    // Latest active version per menu item.
    const recipeByMenuItem = new Map<string, (typeof recipes)[number]>();
    for (const r of recipes) {
      if (!recipeByMenuItem.has(r.menuItemId)) recipeByMenuItem.set(r.menuItemId, r);
    }

    const acc = new Map<string, { requiredQty: number; unit: IngredientUnit }>();
    let menuItemsWithoutRecipe = 0;
    for (const item of items) {
      const recipe = recipeByMenuItem.get(item.menuItemId);
      if (!recipe) {
        menuItemsWithoutRecipe += 1;
        continue;
      }
      const yieldQty = Number(recipe.yieldQty) > 0 ? Number(recipe.yieldQty) : 1;
      for (const line of recipe.lines) {
        const perServe = Number(line.qty) / yieldQty;
        const qty = this.round3(perServe * item.plannedQty);
        const existing = acc.get(line.ingredientId);
        if (existing) {
          existing.requiredQty = this.round3(existing.requiredQty + qty);
        } else {
          acc.set(line.ingredientId, { requiredQty: qty, unit: line.ingredient.unit });
        }
      }
    }

    const lines = Array.from(acc.entries()).map(([ingredientId, v]) => ({
      ingredientId,
      requiredQty: v.requiredQty,
      unit: v.unit,
    }));

    return {
      lines,
      uncostedMenuItems: items
        .filter((i) => !recipeByMenuItem.has(i.menuItemId))
        .map((i) => i.menuItem.name),
      distinctIngredients: acc.size,
      menuItemsWithoutRecipe,
    };
  }

  async listIndents(query: IndentsQueryDto, user: AuthUser) {
    if (!user.tenantId) throw new ForbiddenException('No tenant scope');
    const where: Prisma.IndentWhereInput = { tenantId: user.tenantId };
    if (query.status) where.status = query.status as IndentStatus;
    if (query.siteId) {
      await this.resolveSiteContext(query.siteId, user);
      where.siteId = query.siteId;
    } else if (user.siteId && user.role !== Role.SUPER_ADMIN) {
      where.siteId = user.siteId;
    }
    const indents = await this.prisma.indent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lines: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
        menuPlan: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
    });
    return { success: true, data: indents };
  }

  async getIndent(id: string, user: AuthUser) {
    const indent = await this.findIndent(id, user);
    return { success: true, data: indent };
  }

  async submitIndent(id: string, user: AuthUser) {
    const indent = await this.findIndent(id, user);
    if (indent.status !== IndentStatus.DRAFT) {
      throw new BadRequestException(`Cannot submit an indent in status ${indent.status}`);
    }
    const updated = await this.prisma.indent.update({
      where: { id: indent.id },
      data: { status: IndentStatus.SUBMITTED, submittedAt: new Date() },
      include: this.indentInclude,
    });
    return { success: true, data: updated };
  }

  async approveIndent(id: string, user: AuthUser) {
    const indent = await this.findIndent(id, user);
    if (indent.status !== IndentStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot approve an indent in status ${indent.status}`);
    }
    const updated = await this.prisma.indent.update({
      where: { id: indent.id },
      data: { status: IndentStatus.APPROVED, approvedAt: new Date(), approvedById: user.sub ?? null },
      include: this.indentInclude,
    });
    return { success: true, data: updated };
  }

  async issueIndent(id: string, user: AuthUser) {
    const indent = await this.findIndent(id, user);
    if (indent.status !== IndentStatus.APPROVED) {
      throw new BadRequestException(`Cannot issue an indent in status ${indent.status}`);
    }
    const updated = await this.prisma.indent.update({
      where: { id: indent.id },
      data: { status: IndentStatus.ISSUED, issuedAt: new Date() },
      include: this.indentInclude,
    });
    return { success: true, data: updated };
  }

  async cancelIndent(id: string, user: AuthUser) {
    const indent = await this.findIndent(id, user);
    if (indent.status !== IndentStatus.DRAFT && indent.status !== IndentStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot cancel an indent in status ${indent.status}`);
    }
    const updated = await this.prisma.indent.update({
      where: { id: indent.id },
      data: { status: IndentStatus.CANCELLED },
      include: this.indentInclude,
    });
    return { success: true, data: updated };
  }

  async deleteIndent(id: string, user: AuthUser) {
    const indent = await this.findIndent(id, user);
    if (indent.status !== IndentStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT indents can be deleted');
    }
    await this.prisma.indent.delete({ where: { id: indent.id } });
    return { success: true, data: { id: indent.id, deleted: true } };
  }

  private indentInclude = {
    lines: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
    menuPlan: { select: { id: true, name: true } },
    site: { select: { id: true, name: true } },
    raisedBy: { select: { id: true, email: true } },
    approvedBy: { select: { id: true, email: true } },
  } satisfies Prisma.IndentInclude;

  private async findIndent(id: string, user: AuthUser) {
    const where: Prisma.IndentWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const indent = await this.prisma.indent.findFirst({
      where,
      include: this.indentInclude,
    });
    if (!indent) throw new NotFoundException('Indent not found');
    if (indent.siteId && user.siteId && user.role !== Role.SUPER_ADMIN && indent.siteId !== user.siteId) {
      throw new ForbiddenException('You do not have access to this indent');
    }
    return indent;
  }
}