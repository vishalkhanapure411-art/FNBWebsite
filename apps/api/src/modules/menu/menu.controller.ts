import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { MenuService } from './menu.service';
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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

@ApiTags('Menu')
@Controller('menu')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ══════════════════════════════════════════════════
  // MENU CRUD
  // ══════════════════════════════════════════════════

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Create a menu' })
  create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List menus with filtering' })
  findAll(@Query() query: QueryMenuDto, @Req() req: Request) {
    return this.menuService.findAll(query, req.user as any);
  }

  @Get('available/:siteId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH, Role.KITCHEN_STAFF, Role.CUSTOMER)
  @ApiOperation({ summary: 'Get available menu for a site (customer/POS facing)' })
  getAvailable(@Param('siteId') siteId: string, @Req() req: Request) {
    return this.menuService.getAvailableMenu(siteId, req.user as any);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Get menu with categories, items, modifiers' })
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.menuService.findById(id, req.user as any);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Update menu details' })
  update(@Param('id') id: string, @Body() dto: UpdateMenuDto, @Req() req: Request) {
    return this.menuService.update(id, dto, req.user as any);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Soft-delete a menu' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.menuService.remove(id, req.user as any);
  }

  @Post(':id/assign')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Assign menu to sites' })
  assign(@Param('id') id: string, @Body() dto: MenuAssignDto, @Req() req: Request) {
    return this.menuService.assignToSites(id, dto, req.user as any);
  }

  @Delete(':id/assign/:siteId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Remove menu from a site' })
  unassign(@Param('id') id: string, @Param('siteId') siteId: string, @Req() req: Request) {
    return this.menuService.unassignFromSite(id, siteId, req.user as any);
  }

  // ══════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════

  @Post(':menuId/categories')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create a category under a menu' })
  createCategory(
    @Param('menuId') menuId: string,
    @Body() dto: CreateCategoryDto,
    @Req() req: Request,
  ) {
    return this.menuService.createCategory(menuId, dto, req.user as any);
  }

  @Get(':menuId/categories')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH, Role.KITCHEN_STAFF)
  @ApiOperation({ summary: 'List categories in a menu' })
  listCategories(@Param('menuId') menuId: string, @Req() req: Request) {
    return this.menuService.listCategories(menuId, req.user as any);
  }

  @Patch(':menuId/categories/:categoryId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update a category' })
  updateCategory(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: Request,
  ) {
    return this.menuService.updateCategory(menuId, categoryId, dto, req.user as any);
  }

  @Delete(':menuId/categories/:categoryId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Delete a category (cascade items)' })
  deleteCategory(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: Request,
  ) {
    return this.menuService.deleteCategory(menuId, categoryId, req.user as any);
  }

  // ══════════════════════════════════════════════════
  // ITEMS
  // ══════════════════════════════════════════════════

  @Post(':menuId/categories/:categoryId/items')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create a menu item with full fields' })
  createItem(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateMenuItemDto,
    @Req() req: Request,
  ) {
    return this.menuService.createItem(menuId, categoryId, dto, req.user as any);
  }

  @Get(':menuId/categories/:categoryId/items')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH, Role.KITCHEN_STAFF)
  @ApiOperation({ summary: 'List items in a category with modifier groups' })
  listItems(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: Request,
  ) {
    return this.menuService.listItems(menuId, categoryId, req.user as any);
  }

  @Patch(':menuId/categories/:categoryId/items/:itemId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update item. Set status=EIGHTY_SIX to 86' })
  updateItem(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto,
    @Req() req: Request,
  ) {
    return this.menuService.updateItem(menuId, categoryId, itemId, dto, req.user as any);
  }

  @Delete(':menuId/categories/:categoryId/items/:itemId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Soft-delete item (DISCONTINUED)' })
  deleteItem(
    @Param('menuId') menuId: string,
    @Param('categoryId') categoryId: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ) {
    return this.menuService.deleteItem(menuId, categoryId, itemId, req.user as any);
  }

  // ══════════════════════════════════════════════════
  // MODIFIER GROUPS (under items)
  // ══════════════════════════════════════════════════

  @Post('items/:itemId/modifier-groups')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create modifier group for an item' })
  createModifierGroup(
    @Param('itemId') itemId: string,
    @Body() dto: CreateModifierGroupDto,
    @Req() req: Request,
  ) {
    return this.menuService.createModifierGroup(itemId, dto, req.user as any);
  }

  @Get('items/:itemId/modifier-groups')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.FOH, Role.KITCHEN_STAFF)
  @ApiOperation({ summary: 'List modifier groups for an item' })
  listModifierGroups(@Param('itemId') itemId: string, @Req() req: Request) {
    return this.menuService.listModifierGroups(itemId, req.user as any);
  }

  @Patch('items/:itemId/modifier-groups/:groupId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update modifier group' })
  updateModifierGroup(
    @Param('itemId') itemId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateModifierGroupDto,
    @Req() req: Request,
  ) {
    return this.menuService.updateModifierGroup(itemId, groupId, dto, req.user as any);
  }

  @Delete('items/:itemId/modifier-groups/:groupId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Delete modifier group with modifiers' })
  deleteModifierGroup(
    @Param('itemId') itemId: string,
    @Param('groupId') groupId: string,
    @Req() req: Request,
  ) {
    return this.menuService.deleteModifierGroup(itemId, groupId, req.user as any);
  }

  // ══════════════════════════════════════════════════
  // MODIFIERS (under modifier groups)
  // ══════════════════════════════════════════════════

  @Post('modifier-groups/:groupId/modifiers')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create modifier in a group' })
  createModifier(
    @Param('groupId') groupId: string,
    @Body() dto: CreateModifierDto,
    @Req() req: Request,
  ) {
    return this.menuService.createModifier(groupId, dto, req.user as any);
  }

  @Get('modifier-groups/:groupId/modifiers')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List modifiers in a group' })
  listModifiers(@Param('groupId') groupId: string, @Req() req: Request) {
    return this.menuService.listModifiers(groupId, req.user as any);
  }

  @Patch('modifier-groups/:groupId/modifiers/:modifierId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update a modifier' })
  updateModifier(
    @Param('groupId') groupId: string,
    @Param('modifierId') modifierId: string,
    @Body() dto: UpdateModifierDto,
    @Req() req: Request,
  ) {
    return this.menuService.updateModifier(groupId, modifierId, dto, req.user as any);
  }

  @Delete('modifier-groups/:groupId/modifiers/:modifierId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Delete a modifier' })
  deleteModifier(
    @Param('groupId') groupId: string,
    @Param('modifierId') modifierId: string,
    @Req() req: Request,
  ) {
    return this.menuService.deleteModifier(groupId, modifierId, req.user as any);
  }
}
