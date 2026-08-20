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
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  ApplyDiscountDto,
  QueryOrdersDto,
  AddOrderItemDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Create an order with items, compute totals, generate order number' })
  create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    return this.ordersService.create(dto, req.user as any);
  }

  @Get('kitchen-queue')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.KITCHEN_STAFF)
  @ApiOperation({ summary: 'Get active orders grouped by station (KDS feed)' })
  kitchenQueue(@Query('siteId') siteId: string, @Req() req: Request) {
    if (!siteId) return { success: true, data: {} };
    return this.ordersService.getKitchenQueue(siteId, req.user as any);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH, Role.KITCHEN_STAFF)
  @ApiOperation({ summary: 'List orders with filtering and pagination' })
  findAll(@Query() query: QueryOrdersDto, @Req() req: Request) {
    return this.ordersService.findAll(query, req.user as any);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH, Role.KITCHEN_STAFF)
  @ApiOperation({ summary: 'Get full order detail with items, discounts, payments' })
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.ordersService.findById(id, req.user as any);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH, Role.KITCHEN_STAFF)
  @ApiOperation({ summary: 'Update order status with transition validation' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request,
  ) {
    return this.ordersService.updateStatus(id, dto, req.user as any);
  }

  @Post(':id/items')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Add item to existing order (recalculate totals)' })
  addItem(@Param('id') id: string, @Body() dto: AddOrderItemDto, @Req() req: Request) {
    return this.ordersService.addItem(id, dto, req.user as any);
  }

  @Patch(':id/items/:itemId/cancel')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Cancel individual item on an order' })
  cancelItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ) {
    return this.ordersService.cancelItem(id, itemId, req.user as any);
  }

  @Post(':id/discounts')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Apply discount to order' })
  applyDiscount(
    @Param('id') id: string,
    @Body() dto: ApplyDiscountDto,
    @Req() req: Request,
  ) {
    return this.ordersService.applyDiscount(id, dto, req.user as any);
  }

  @Delete(':id/discounts/:discountId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Remove discount from order' })
  removeDiscount(
    @Param('id') id: string,
    @Param('discountId') discountId: string,
    @Req() req: Request,
  ) {
    return this.ordersService.removeDiscount(id, discountId, req.user as any);
  }

  @Post(':id/cancel')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Cancel entire order' })
  cancelOrder(@Param('id') id: string, @Req() req: Request) {
    return this.ordersService.cancelOrder(id, req.user as any);
  }
}
