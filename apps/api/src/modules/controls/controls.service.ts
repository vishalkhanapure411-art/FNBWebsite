import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, IngredientUnit, ClosingPeriodStatus } from '@omniops/shared';
import { Prisma, OrderStatus } from '@prisma/client';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  CreateRecipeDto,
  UpdateRecipeDto,
  CreateClosingPeriodDto,
  CogsQueryDto,
  ClosingsQueryDto,
} from './dto';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; sub: string };

const REALIZED: Prisma.OrderWhereInput = {
  status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.DRAFT] },
};

@Injectable()
export class ControlsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────
  // Access helpers (tenant isolation + site-scoped CONTROLS lock)
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
    // Site-scoped CONTROLS may only access their own site.
    if (user.siteId && user.role !== Role.SUPER_ADMIN && site.id !== user.siteId) {
      throw new ForbiddenException('You do not have access to this site');
    }
    return site;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }

  // ──────────────────────────────────────────────────────────────
  // Ingredients CRUD (tenant-level)
  // ──────────────────────────────────────────────────────────────

  async createIngredient(dto: CreateIngredientDto, user: AuthUser) {
    const tenantId = await this.resolveTenant(user, (dto as any).siteId);
    const ingredient = await this.prisma.ingredient.create({
      data: {
        tenantId,
        name: dto.name,
        unit: dto.unit as IngredientUnit,
        costPerUnit: dto.costPerUnit,
        supplier: dto.supplier ?? null,
        active: dto.active ?? true,
      },
    });
    return { success: true, data: ingredient };
  }

  async listIngredients(user: AuthUser, active?: string) {
    if (!user.tenantId) throw new ForbiddenException('No tenant scope');
    const where: Prisma.IngredientWhereInput = { tenantId: user.tenantId };
    if (active === 'true') where.active = true;
    else if (active === 'false') where.active = false;
    const ingredients = await this.prisma.ingredient.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { recipeLines: true } } },
    });
    return { success: true, data: ingredients };
  }

  async getIngredient(id: string, user: AuthUser) {
    const ingredient = await this.findIngredient(id, user);
    return { success: true, data: ingredient };
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto, user: AuthUser) {
    const existing = await this.findIngredient(id, user);
    const ingredient = await this.prisma.ingredient.update({
      where: { id: existing.id },
      data: {
        name: dto.name ?? existing.name,
        unit: (dto.unit as IngredientUnit) ?? existing.unit,
        costPerUnit: dto.costPerUnit ?? Number(existing.costPerUnit),
        supplier: dto.supplier !== undefined ? dto.supplier : existing.supplier,
        active: dto.active ?? existing.active,
      },
    });
    return { success: true, data: ingredient };
  }

  async deleteIngredient(id: string, user: AuthUser) {
    const existing = await this.findIngredient(id, user);
    try {
      await this.prisma.ingredient.delete({ where: { id: existing.id } });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2003') {
        throw new BadRequestException('Ingredient is referenced by recipe lines and cannot be deleted');
      }
      throw e;
    }
    return { success: true, data: { id: existing.id, deleted: true } };
  }

  private async findIngredient(id: string, user: AuthUser) {
    const where: Prisma.IngredientWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const ingredient = await this.prisma.ingredient.findFirst({ where });
    if (!ingredient) throw new NotFoundException('Ingredient not found');
    return ingredient;
  }

  // ──────────────────────────────────────────────────────────────
  // Recipes CRUD (BOM + versioning + computed cost)
  // ──────────────────────────────────────────────────────────────

  async createRecipe(dto: CreateRecipeDto, user: AuthUser) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
      include: { menu: { select: { tenantId: true } } },
    });
    if (!menuItem) throw new NotFoundException('Menu item not found');
    const menuTenantId = menuItem.menu.tenantId;
    if (user.role !== Role.SUPER_ADMIN && user.tenantId && menuTenantId !== user.tenantId) {
      throw new ForbiddenException('Menu item not in your tenant');
    }
    const { costPerServe, lines } = await this.computeCost(dto.lines, menuTenantId, dto.yieldQty);
    const recipe = await this.prisma.recipe.create({
      data: {
        tenantId: menuTenantId,
        menuItemId: dto.menuItemId,
        name: dto.name ?? menuItem.name,
        yieldQty: dto.yieldQty ?? 1,
        version: 1,
        costPerServe,
        active: true,
        lines: {
          create: lines.map((l) => ({
            ingredientId: l.ingredientId,
            qty: l.qty,
            unit: l.unit as IngredientUnit,
          })),
        },
      },
      include: { lines: { include: { ingredient: true } }, menuItem: true },
    });
    return { success: true, data: recipe };
  }

  async listRecipes(user: AuthUser, active?: string) {
    if (!user.tenantId) throw new ForbiddenException('No tenant scope');
    const where: Prisma.RecipeWhereInput = { tenantId: user.tenantId };
    if (active === 'true') where.active = true;
    const recipes = await this.prisma.recipe.findMany({
      where,
      orderBy: [{ menuItemId: 'asc' }, { version: 'desc' }],
      include: { lines: { include: { ingredient: true } }, menuItem: true },
    });
    return { success: true, data: recipes };
  }

  async getRecipe(id: string, user: AuthUser) {
    const recipe = await this.findRecipe(id, user);
    return { success: true, data: recipe };
  }

  async listRecipeVersions(id: string, user: AuthUser) {
    // Accept a recipe id OR menuItemId; resolve to menuItemId for the history.
    const where: Prisma.RecipeWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const recipe = await this.prisma.recipe.findFirst({ where });
    if (!recipe) throw new NotFoundException('Recipe not found');
    const versions = await this.prisma.recipe.findMany({
      where: { menuItemId: recipe.menuItemId, tenantId: recipe.tenantId },
      orderBy: { version: 'desc' },
      include: { lines: { include: { ingredient: true } }, menuItem: true },
    });
    return { success: true, data: versions };
  }

  async updateRecipe(id: string, dto: UpdateRecipeDto, user: AuthUser) {
    const existing = await this.findRecipe(id, user);
    if (!existing.active) {
      throw new BadRequestException('Cannot update an inactive recipe version');
    }
    // Compute with the (possibly new) lines/yield, but resolve tenant from the recipe.
    const menuItem = existing.menuItem;
    const { costPerServe, lines } = await this.computeCost(
      dto.lines ?? existing.lines.map((l) => ({ ingredientId: l.ingredientId, qty: Number(l.qty), unit: l.unit })),
      existing.tenantId,
      dto.yieldQty ?? Number(existing.yieldQty),
    );
    const nextVersion = existing.version + 1;

    // Create a new version row; deactivate the previous one (versioning).
    const [newRecipe] = await this.prisma.$transaction([
      this.prisma.recipe.create({
        data: {
          tenantId: existing.tenantId,
          menuItemId: existing.menuItemId,
          name: dto.name ?? existing.name,
          yieldQty: dto.yieldQty ?? existing.yieldQty,
          version: nextVersion,
          costPerServe,
          active: dto.active ?? true,
          lines: {
            create: lines.map((l) => ({
              ingredientId: l.ingredientId,
              qty: l.qty,
              unit: l.unit as IngredientUnit,
            })),
          },
        },
        include: { lines: { include: { ingredient: true } }, menuItem: true },
      }),
      this.prisma.recipe.update({ where: { id: existing.id }, data: { active: false } }),
    ]);
    return { success: true, data: newRecipe, previousVersion: existing.version };
  }

  private async findRecipe(id: string, user: AuthUser) {
    const where: Prisma.RecipeWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const recipe = await this.prisma.recipe.findFirst({
      where,
      include: { lines: { include: { ingredient: true } }, menuItem: true },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }

  /** Compute costPerServe = Σ(qty × costPerUnit) / yieldQty */
  private async computeCost(
    lines: { ingredientId: string; qty: number; unit: IngredientUnit }[],
    tenantId: string,
    yieldQty = 1,
  ): Promise<{ costPerServe: number; lines: { ingredientId: string; qty: number; unit: IngredientUnit }[] }> {
    const ids = lines.map((l) => l.ingredientId);
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ids }, tenantId },
    });
    const byId = new Map(ingredients.map((i) => [i.id, i]));
    let total = 0;
    for (const line of lines) {
      const ing = byId.get(line.ingredientId);
      if (!ing) throw new BadRequestException(`Ingredient ${line.ingredientId} not found in tenant`);
      total += line.qty * Number(ing.costPerUnit);
    }
    const costPerServe = this.round(Number(yieldQty) > 0 ? total / Number(yieldQty) : total);
    return { costPerServe, lines };
  }

  // ──────────────────────────────────────────────────────────────
  // COGS report
  // ──────────────────────────────────────────────────────────────

  async getCogs(query: CogsQueryDto, user: AuthUser) {
    const site = await this.resolveSiteContext(query.siteId, user);
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (from >= to) throw new BadRequestException('from must be before to');

    const orders = await this.prisma.order.findMany({
      where: {
        siteId: site.id,
        tenantId: site.tenantId,
        createdAt: { gte: from, lt: to },
        ...REALIZED,
      },
      include: { items: { include: { menuItem: true } } },
    });

    // Latest active recipe cost per menu item
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId: site.tenantId, active: true },
      orderBy: { version: 'desc' },
    });
    const costByMenu = new Map<string, number>();
    recipes.forEach((r) => {
      if (!costByMenu.has(r.menuItemId)) costByMenu.set(r.menuItemId, Number(r.costPerServe));
    });

    const perItem = new Map<string, { menuItemId: string; name: string; qty: number; revenue: number; cost: number }>();
    let uncosted = new Set<string>();
    let totalRevenue = 0;
    let totalCogs = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const key = item.menuItemId;
        const qty = Number(item.quantity);
        const revenue = Number(item.totalPrice);
        const costPer = costByMenu.get(key);
        const cost = costPer !== undefined ? costPer * qty : 0;
        if (costPer === undefined) uncosted.add(key);

        const bucket = perItem.get(key) ?? { menuItemId: key, name: item.name, qty: 0, revenue: 0, cost: 0 };
        bucket.qty += qty;
        bucket.revenue = this.round(bucket.revenue + revenue);
        bucket.cost = this.round(bucket.cost + cost);
        perItem.set(key, bucket);
        totalRevenue = this.round(totalRevenue + revenue);
        totalCogs = this.round(totalCogs + cost);
      }
    }

    const grossMargin = this.round(totalRevenue - totalCogs);
    const marginPct = totalRevenue > 0 ? this.round((grossMargin / totalRevenue) * 100) : 0;

    return {
      success: true,
      data: {
        siteId: site.id,
        siteName: site.name,
        from: from.toISOString(),
        to: to.toISOString(),
        perItem: Array.from(perItem.values()).sort((a, b) => b.revenue - a.revenue),
        uncostedItems: Array.from(uncosted),
        totals: { revenue: totalRevenue, cogs: totalCogs, grossMargin, marginPct },
      },
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Month closings (OPEN → LOCKED)
  // ──────────────────────────────────────────────────────────────

  async listClosings(query: ClosingsQueryDto, user: AuthUser) {
    const tenantId = await this.resolveTenant(user, query.siteId);
    const where: Prisma.ClosingPeriodWhereInput = { tenantId };
    if (query.siteId) {
      const site = await this.resolveSiteContext(query.siteId, user);
      where.siteId = site.id;
    } else if (user.siteId && user.role !== Role.SUPER_ADMIN) {
      where.siteId = user.siteId;
    }
    const periods = await this.prisma.closingPeriod.findMany({
      where,
      orderBy: [{ startDate: 'desc' }],
      include: { site: { select: { id: true, name: true } } },
    });
    return { success: true, data: periods };
  }

  async createClosingPeriod(dto: CreateClosingPeriodDto, user: AuthUser) {
    let tenantId = user.tenantId;
    if (dto.siteId) {
      const site = await this.resolveSiteContext(dto.siteId, user);
      tenantId = site.tenantId;
    }
    if (!tenantId) throw new BadRequestException('Unable to resolve tenant');
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start >= end) throw new BadRequestException('startDate must be before endDate');
    const period = await this.prisma.closingPeriod.create({
      data: {
        tenantId,
        siteId: dto.siteId ?? null,
        label: dto.label,
        startDate: start,
        endDate: end,
        status: ClosingPeriodStatus.OPEN,
        revenue: 0,
        cogs: 0,
        grossMargin: 0,
      },
    });
    return { success: true, data: period };
  }

  async closeClosingPeriod(id: string, user: AuthUser) {
    const period = await this.findClosingPeriod(id, user);
    if (period.status === ClosingPeriodStatus.LOCKED) {
      throw new BadRequestException('Closing period is already locked');
    }
    const { revenue, cogs } = await this.computeClosingFigures(period);
    const grossMargin = this.round(revenue - cogs);
    const updated = await this.prisma.closingPeriod.update({
      where: { id: period.id },
      data: {
        status: ClosingPeriodStatus.LOCKED,
        revenue,
        cogs,
        grossMargin,
        closedAt: new Date(),
        closedById: user.sub ?? null,
      },
      include: { site: { select: { id: true, name: true } }, closedBy: { select: { id: true, email: true } } },
    });
    return { success: true, data: updated };
  }

  async getClosingPeriod(id: string, user: AuthUser) {
    const period = await this.findClosingPeriod(id, user);
    return { success: true, data: period };
  }

  private async findClosingPeriod(id: string, user: AuthUser) {
    const where: Prisma.ClosingPeriodWhereInput = { id };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) where.tenantId = user.tenantId;
    const period = await this.prisma.closingPeriod.findFirst({
      where,
      include: { site: { select: { id: true, name: true } }, closedBy: { select: { id: true, email: true } } },
    });
    if (!period) throw new NotFoundException('Closing period not found');
    // Site-scoped lock: can only manage own-site periods.
    if (period.siteId && user.siteId && user.role !== Role.SUPER_ADMIN && period.siteId !== user.siteId) {
      throw new ForbiddenException('You do not have access to this closing period');
    }
    return period;
  }

  private async computeClosingFigures(period: {
    tenantId: string;
    siteId: string | null;
    startDate: Date;
    endDate: Date;
  }) {
    const orderWhere: Prisma.OrderWhereInput = {
      tenantId: period.tenantId,
      createdAt: { gte: period.startDate, lt: period.endDate },
      ...REALIZED,
    };
    if (period.siteId) orderWhere.siteId = period.siteId;

    const orders = await this.prisma.order.findMany({
      where: orderWhere,
      include: { items: { select: { menuItemId: true, quantity: true, totalPrice: true } } },
    });

    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId: period.tenantId, active: true },
      orderBy: { version: 'desc' },
    });
    const costByMenu = new Map<string, number>();
    recipes.forEach((r) => {
      if (!costByMenu.has(r.menuItemId)) costByMenu.set(r.menuItemId, Number(r.costPerServe));
    });

    let revenue = 0;
    let cogs = 0;
    for (const order of orders) {
      revenue += Number(order.grandTotal);
      for (const item of order.items) {
        const costPer = costByMenu.get(item.menuItemId);
        if (costPer !== undefined) cogs += costPer * Number(item.quantity);
      }
    }
    return { revenue: this.round(revenue), cogs: this.round(cogs) };
  }

  // ──────────────────────────────────────────────────────────────
  // Reject edits after lock (helper used by controller guard)
  // ──────────────────────────────────────────────────────────────
  async findClosingWithLockCheck(id: string, user: AuthUser) {
    const period = await this.findClosingPeriod(id, user);
    if (period.status === ClosingPeriodStatus.LOCKED) {
      throw new BadRequestException('Locked closing period cannot be modified');
    }
    return period;
  }
}
