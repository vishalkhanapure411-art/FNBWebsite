import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateMenuDto,
  UpdateMenuDto,
  QueryMenuDto,
  MenuAssignDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierDto,
  UpdateModifierDto,
} from './dto';
import { Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null };

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════
  // MENU CRUD
  // ══════════════════════════════════════════════════

  async create(dto: CreateMenuDto) {
    const menu = await this.prisma.menu.create({
      data: {
        name: dto.name,
        description: dto.description,
        menuType: dto.menuType ?? 'DINE_IN',
        tenantId: dto.tenantId,
        availabilitySchedule: (dto.availabilitySchedule ?? null) as Prisma.InputJsonValue,
      },
    });
    return { success: true, data: menu };
  }

  async findAll(query: QueryMenuDto, user: AuthUser) {
    const where: Prisma.MenuWhereInput = {};

    if (user.role !== Role.SUPER_ADMIN) {
      where.tenantId = user.tenantId ?? undefined;
    } else if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.menuType) where.menuType = query.menuType;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const menus = await this.prisma.menu.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { categories: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    return {
      success: true,
      data: menus.map((m: any) => ({
        ...m,
        categoryCount: m._count.categories,
        _count: undefined,
      })),
    };
  }

  async findById(id: string, user: AuthUser) {
    const menu = await this.findMenuForUser(id, user, {
      categories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              modifierGroups: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  modifiers: {
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    });

    return { success: true, data: menu };
  }

  async update(id: string, dto: UpdateMenuDto, user: AuthUser) {
    const menu = await this.findMenuForUser(id, user);

    const updated = await this.prisma.menu.update({
      where: { id: menu.id },
      data: {
        ...dto,
        availabilitySchedule: dto.availabilitySchedule as Prisma.InputJsonValue | undefined,
      },
    });

    return { success: true, data: updated };
  }

  async remove(id: string, user: AuthUser) {
    const menu = await this.findMenuForUser(id, user);
    await this.prisma.menu.update({
      where: { id: menu.id },
      data: { isActive: false },
    });
    return { success: true, data: { message: 'Menu soft-deleted' } };
  }

  async assignToSites(menuId: string, dto: MenuAssignDto, user: AuthUser) {
    const menu = await this.findMenuForUser(menuId, user);

    // Verify all sites exist under the menu's tenant
    for (const siteId of dto.siteIds) {
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, tenantId: menu.tenantId },
      });
      if (!site) {
        throw new NotFoundException(`Site ${siteId} not found under this menu's tenant`);
      }
    }

    // Create SiteMenu entries (skip existing)
    const results = [];
    for (const siteId of dto.siteIds) {
      try {
        const sm = await this.prisma.siteMenu.upsert({
          where: { siteId_menuId: { siteId, menuId: menu.id } },
          update: {},
          create: { siteId, menuId: menu.id },
        });
        results.push(sm);
      } catch {
        // skip duplicates
      }
    }

    return { success: true, data: results };
  }

  async unassignFromSite(menuId: string, siteId: string, user: AuthUser) {
    const menu = await this.findMenuForUser(menuId, user);

    await this.prisma.siteMenu.deleteMany({
      where: { menuId: menu.id, siteId },
    });

    return { success: true, data: { message: 'Menu unassigned from site' } };
  }

  // ══════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════

  async createCategory(menuId: string, dto: CreateCategoryDto, user: AuthUser) {
    await this.findMenuForUser(menuId, user);

    const category = await this.prisma.menuCategory.create({
      data: {
        menuId,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        imageUrl: dto.imageUrl,
      },
    });

    return { success: true, data: category };
  }

  async listCategories(menuId: string, user: AuthUser) {
    await this.findMenuForUser(menuId, user);

    const categories = await this.prisma.menuCategory.findMany({
      where: { menuId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    });

    return {
      success: true,
      data: categories.map((c: any) => ({
        ...c,
        itemCount: c._count.items,
        _count: undefined,
      })),
    };
  }

  async updateCategory(menuId: string, categoryId: string, dto: UpdateCategoryDto, user: AuthUser) {
    await this.findMenuForUser(menuId, user);
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, menuId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const updated = await this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: dto,
    });

    return { success: true, data: updated };
  }

  async deleteCategory(menuId: string, categoryId: string, user: AuthUser) {
    await this.findMenuForUser(menuId, user);
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, menuId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // Cascade: delete items (and their modifier groups/modifiers via Prisma cascade)
    await this.prisma.menuCategory.delete({ where: { id: categoryId } });

    return { success: true, data: { message: 'Category deleted' } };
  }

  // ══════════════════════════════════════════════════
  // ITEMS
  // ══════════════════════════════════════════════════

  async createItem(
    menuId: string,
    categoryId: string,
    dto: CreateMenuItemDto,
    user: AuthUser,
  ) {
    await this.findMenuForUser(menuId, user);
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, menuId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const item = await this.prisma.menuItem.create({
      data: {
        menuId,
        categoryId,
        name: dto.name,
        description: dto.description,
        shortCode: dto.shortCode,
        price: dto.price,
        costPrice: dto.costPrice,
        taxRate: dto.taxRate ?? 0,
        prepTimeMinutes: dto.prepTimeMinutes ?? 10,
        station: dto.station ?? 'EXPO',
        dietaryTags: dto.dietaryTags ?? [],
        allergens: dto.allergens ?? [],
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? 'AVAILABLE',
      },
      include: {
        modifierGroups: {
          include: { modifiers: true },
        },
      },
    });

    return { success: true, data: item };
  }

  async listItems(menuId: string, categoryId: string, user: AuthUser) {
    await this.findMenuForUser(menuId, user);

    const items = await this.prisma.menuItem.findMany({
      where: { menuId, categoryId },
      orderBy: { sortOrder: 'asc' },
      include: {
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            modifiers: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return { success: true, data: items };
  }

  async updateItem(
    menuId: string,
    categoryId: string,
    itemId: string,
    dto: UpdateMenuItemDto,
    user: AuthUser,
  ) {
    await this.findMenuForUser(menuId, user);
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuId, categoryId },
    });
    if (!item) throw new NotFoundException('Item not found');

    const updated = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: dto as any,
      include: {
        modifierGroups: {
          include: { modifiers: true },
        },
      },
    });

    return { success: true, data: updated };
  }

  async deleteItem(menuId: string, categoryId: string, itemId: string, user: AuthUser) {
    await this.findMenuForUser(menuId, user);
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuId, categoryId },
    });
    if (!item) throw new NotFoundException('Item not found');

    await this.prisma.menuItem.update({
      where: { id: itemId },
      data: { status: 'DISCONTINUED' },
    });

    return { success: true, data: { message: 'Item soft-deleted (DISCONTINUED)' } };
  }

  // ══════════════════════════════════════════════════
  // MODIFIER GROUPS
  // ══════════════════════════════════════════════════

  async createModifierGroup(itemId: string, dto: CreateModifierGroupDto, user: AuthUser) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menu item not found');

    const group = await this.prisma.menuItemModifierGroup.create({
      data: {
        menuItemId: itemId,
        name: dto.name,
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? 1,
        required: dto.required ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { modifiers: true },
    });

    return { success: true, data: group };
  }

  async listModifierGroups(itemId: string, user: AuthUser) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menu item not found');

    const groups = await this.prisma.menuItemModifierGroup.findMany({
      where: { menuItemId: itemId },
      orderBy: { sortOrder: 'asc' },
      include: {
        modifiers: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return { success: true, data: groups };
  }

  async updateModifierGroup(itemId: string, groupId: string, dto: UpdateModifierGroupDto, user: AuthUser) {
    const group = await this.prisma.menuItemModifierGroup.findFirst({
      where: { id: groupId, menuItemId: itemId },
    });
    if (!group) throw new NotFoundException('Modifier group not found');

    const updated = await this.prisma.menuItemModifierGroup.update({
      where: { id: groupId },
      data: dto,
      include: { modifiers: true },
    });

    return { success: true, data: updated };
  }

  async deleteModifierGroup(itemId: string, groupId: string, user: AuthUser) {
    const group = await this.prisma.menuItemModifierGroup.findFirst({
      where: { id: groupId, menuItemId: itemId },
    });
    if (!group) throw new NotFoundException('Modifier group not found');

    await this.prisma.menuItemModifierGroup.delete({ where: { id: groupId } });
    return { success: true, data: { message: 'Modifier group deleted' } };
  }

  // ══════════════════════════════════════════════════
  // MODIFIERS
  // ══════════════════════════════════════════════════

  async createModifier(groupId: string, dto: CreateModifierDto, user: AuthUser) {
    const group = await this.prisma.menuItemModifierGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Modifier group not found');

    const modifier = await this.prisma.menuItemModifier.create({
      data: {
        modifierGroupId: groupId,
        name: dto.name,
        priceAdjustment: dto.priceAdjustment ?? 0,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return { success: true, data: modifier };
  }

  async listModifiers(groupId: string, user: AuthUser) {
    const group = await this.prisma.menuItemModifierGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Modifier group not found');

    const modifiers = await this.prisma.menuItemModifier.findMany({
      where: { modifierGroupId: groupId },
      orderBy: { sortOrder: 'asc' },
    });

    return { success: true, data: modifiers };
  }

  async updateModifier(groupId: string, modifierId: string, dto: UpdateModifierDto, user: AuthUser) {
    const modifier = await this.prisma.menuItemModifier.findFirst({
      where: { id: modifierId, modifierGroupId: groupId },
    });
    if (!modifier) throw new NotFoundException('Modifier not found');

    const updated = await this.prisma.menuItemModifier.update({
      where: { id: modifierId },
      data: dto,
    });

    return { success: true, data: updated };
  }

  async deleteModifier(groupId: string, modifierId: string, user: AuthUser) {
    const modifier = await this.prisma.menuItemModifier.findFirst({
      where: { id: modifierId, modifierGroupId: groupId },
    });
    if (!modifier) throw new NotFoundException('Modifier not found');

    await this.prisma.menuItemModifier.delete({ where: { id: modifierId } });
    return { success: true, data: { message: 'Modifier deleted' } };
  }

  // ══════════════════════════════════════════════════
  // MENU AVAILABILITY (for POS / customer app)
  // ══════════════════════════════════════════════════

  async getAvailableMenu(siteId: string, user: AuthUser) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    // Get all assigned menus for this site
    const siteMenus = await this.prisma.siteMenu.findMany({
      where: { siteId },
      include: {
        menu: {
          include: {
            categories: {
              where: {
                items: { some: { status: { notIn: ['EIGHTY_SIX', 'DISCONTINUED'] } } },
              },
              orderBy: { sortOrder: 'asc' },
              include: {
                items: {
                  where: {
                    status: { notIn: ['EIGHTY_SIX', 'DISCONTINUED'] },
                  },
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    modifierGroups: {
                      orderBy: { sortOrder: 'asc' },
                      include: {
                        modifiers: {
                          orderBy: { sortOrder: 'asc' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filter out menus that aren't active
    const activeMenus = siteMenus
      .filter((sm: any) => sm.menu.isActive)
      .map((sm: any) => sm.menu);

    return { success: true, data: activeMenus };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  private async findMenuForUser(
    id: string,
    user: AuthUser,
    include?: Prisma.MenuInclude,
  ) {
    const where: Prisma.MenuWhereInput = { id };

    if (user.role !== Role.SUPER_ADMIN) {
      where.tenantId = user.tenantId ?? undefined;
    }

    const menu = await this.prisma.menu.findFirst({ where, include });
    if (!menu) throw new NotFoundException('Menu not found');
    return menu;
  }
}
