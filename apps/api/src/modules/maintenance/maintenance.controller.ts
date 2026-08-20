import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { MaintenanceService } from './maintenance.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetStatusDto,
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  TicketStatusDto,
  AddCommentDto,
  AddPhotoDto,
  CreateVendorDto,
  UpdateVendorDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

@ApiTags('Maintenance')
@Controller('maintenance')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // ─── ASSETS ───

  @Get('assets')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'List assets' })
  listAssets(
    @Query('siteId') siteId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    return this.maintenanceService.listAssets(siteId, (req as any).user, {
      category,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('assets/:id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Get asset detail' })
  getAsset(@Param('id') id: string, @Req() req: Request) {
    return this.maintenanceService.getAsset(id, (req as any).user);
  }

  @Post('assets')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Create asset' })
  createAsset(@Body() dto: CreateAssetDto, @Req() req: Request) {
    return this.maintenanceService.createAsset(dto, (req as any).user);
  }

  @Patch('assets/:id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Update asset' })
  updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto, @Req() req: Request) {
    return this.maintenanceService.updateAsset(id, dto, (req as any).user);
  }

  @Patch('assets/:id/status')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Change asset status' })
  updateAssetStatus(@Param('id') id: string, @Body() dto: AssetStatusDto, @Req() req: Request) {
    return this.maintenanceService.updateAssetStatus(id, dto, (req as any).user);
  }

  // ─── TICKETS ───

  @Get('tickets')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'List tickets' })
  listTickets(
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    return this.maintenanceService.listTickets(siteId, (req as any).user, {
      status,
      priority,
      category,
      assignedToId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('tickets/:id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Get ticket detail' })
  getTicket(@Param('id') id: string, @Req() req: Request) {
    return this.maintenanceService.getTicket(id, (req as any).user);
  }

  @Post('tickets')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Create ticket' })
  createTicket(@Body() dto: CreateTicketDto, @Req() req: Request) {
    return this.maintenanceService.createTicket(dto, (req as any).user);
  }

  @Patch('tickets/:id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Update ticket' })
  updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Req() req: Request) {
    return this.maintenanceService.updateTicket(id, dto, (req as any).user);
  }

  @Patch('tickets/:id/assign')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Assign ticket' })
  assignTicket(@Param('id') id: string, @Body() dto: AssignTicketDto, @Req() req: Request) {
    return this.maintenanceService.assignTicket(id, dto, (req as any).user);
  }

  @Patch('tickets/:id/status')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Transition ticket status' })
  updateTicketStatus(@Param('id') id: string, @Body() dto: TicketStatusDto, @Req() req: Request) {
    return this.maintenanceService.updateTicketStatus(id, dto, (req as any).user);
  }

  @Post('tickets/:id/comments')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Add comment to ticket' })
  addComment(@Param('id') id: string, @Body() dto: AddCommentDto, @Req() req: Request) {
    return this.maintenanceService.addComment(id, dto, (req as any).user);
  }

  @Post('tickets/:id/photos')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Add photo to ticket' })
  addPhoto(@Param('id') id: string, @Body() dto: AddPhotoDto, @Req() req: Request) {
    return this.maintenanceService.addPhoto(id, dto, (req as any).user);
  }

  // ─── VENDORS ───

  @Get('vendors')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'List vendors' })
  listVendors(@Query('category') category: string | undefined, @Req() req: Request) {
    return this.maintenanceService.listVendors((req as any).user, category);
  }

  @Post('vendors')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create vendor' })
  createVendor(@Body() dto: CreateVendorDto, @Req() req: Request) {
    return this.maintenanceService.createVendor(dto, (req as any).user);
  }

  @Patch('vendors/:id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update vendor' })
  updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto, @Req() req: Request) {
    return this.maintenanceService.updateVendor(id, dto, (req as any).user);
  }

  // ─── SCHEDULES ───

  @Get('schedules')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'List schedules' })
  listSchedules(
    @Query('assetId') assetId?: string,
    @Query('siteId') siteId?: string,
    @Req() req?: Request,
  ) {
    return this.maintenanceService.listSchedules((req as any).user, { assetId, siteId });
  }

  @Post('schedules')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create schedule' })
  createSchedule(@Body() dto: CreateScheduleDto, @Req() req: Request) {
    return this.maintenanceService.createSchedule(dto, (req as any).user);
  }

  @Patch('schedules/:id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update schedule' })
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto, @Req() req: Request) {
    return this.maintenanceService.updateSchedule(id, dto, (req as any).user);
  }

  @Post('schedules/:id/complete')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.MAINTENANCE_TECH)
  @ApiOperation({ summary: 'Mark schedule as completed' })
  completeSchedule(@Param('id') id: string, @Req() req: Request) {
    return this.maintenanceService.completeSchedule(id, (req as any).user);
  }
}
