import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto, QueryShiftsDto, AddStaffDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

@ApiTags('Shifts')
@Controller('shifts')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Open a new shift for a site' })
  openShift(@Body() dto: OpenShiftDto, @Req() req: Request) {
    return this.shiftsService.openShift(dto, req.user as any);
  }

  @Post(':id/close')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Close a shift with cash reconciliation' })
  closeShift(@Param('id') id: string, @Body() dto: CloseShiftDto, @Req() req: Request) {
    return this.shiftsService.closeShift(id, dto, req.user as any);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List shifts with role-based scoping' })
  findAll(@Query() query: QueryShiftsDto, @Req() req: Request) {
    return this.shiftsService.findAll(query, req.user as any);
  }

  @Get('active')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Get currently open shift for a site' })
  getActiveShift(@Query('siteId') siteId: string, @Req() req: Request) {
    return this.shiftsService.getActiveShift(siteId, req.user as any);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Get shift detail with staff and cash summary' })
  findById(@Param('id') id: string, @Req() req: Request) {
    return this.shiftsService.findById(id, req.user as any);
  }

  @Post(':id/staff')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Add a user to shift staff' })
  addStaff(@Param('id') id: string, @Body() dto: AddStaffDto, @Req() req: Request) {
    return this.shiftsService.addStaff(id, dto, req.user as any);
  }

  @Delete(':id/staff/:userId')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Remove staff from shift' })
  removeStaff(@Param('id') id: string, @Param('userId') userId: string, @Req() req: Request) {
    return this.shiftsService.removeStaff(id, userId, req.user as any);
  }
}
