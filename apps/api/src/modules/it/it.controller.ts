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
import { ItService } from './it.service';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  DevicesQueryDto,
  CreateRoutingDto,
  UpdateRoutingDto,
  RoutingsQueryDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

// IT + management + SITE_LEAD can view; IT (and SUPER_ADMIN) can write.
const READ_ROLES = [
  Role.SUPER_ADMIN,
  Role.IT,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
  Role.SITE_LEAD,
];
const WRITE_ROLES = [Role.SUPER_ADMIN, Role.IT];

@ApiTags('IT / Device Configuration')
@Controller('it')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ItController {
  constructor(private readonly itService: ItService) {}

  // ── Devices ──
  @Post('devices')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Create a device (KDS/CDS/KOT printer)' })
  createDevice(@Body() dto: CreateDeviceDto, @Req() req: Request) {
    return this.itService.createDevice(dto, (req as any).user);
  }

  @Get('devices')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List devices (site-scoped, optional type filter)' })
  listDevices(@Query() query: DevicesQueryDto, @Req() req: Request) {
    return this.itService.listDevices((req as any).user, query);
  }

  @Get('devices/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single device' })
  getDevice(@Param('id') id: string, @Req() req: Request) {
    return this.itService.getDevice(id, (req as any).user);
  }

  @Patch('devices/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Update a device (name/type/station/ip/notes/online/heartbeat)' })
  updateDevice(@Param('id') id: string, @Body() dto: UpdateDeviceDto, @Req() req: Request) {
    return this.itService.updateDevice(id, dto, (req as any).user);
  }

  @Delete('devices/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Delete a device (fails if referenced as a routing printer)' })
  deleteDevice(@Param('id') id: string, @Req() req: Request) {
    return this.itService.deleteDevice(id, (req as any).user);
  }

  // ── Product routings ──
  @Post('routings')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Create a product routing (menu item → station + optional printer)' })
  createRouting(@Body() dto: CreateRoutingDto, @Req() req: Request) {
    return this.itService.createRouting(dto, (req as any).user);
  }

  @Get('routings')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List product routings (site-scoped, optional station/menuItemId filters)' })
  listRoutings(@Query() query: RoutingsQueryDto, @Req() req: Request) {
    return this.itService.listRoutings((req as any).user, query);
  }

  @Get('routings/:id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single product routing' })
  getRouting(@Param('id') id: string, @Req() req: Request) {
    return this.itService.getRouting(id, (req as any).user);
  }

  @Patch('routings/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Update a product routing (station/printerId)' })
  updateRouting(@Param('id') id: string, @Body() dto: UpdateRoutingDto, @Req() req: Request) {
    return this.itService.updateRouting(id, dto, (req as any).user);
  }

  @Delete('routings/:id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Delete a product routing' })
  deleteRouting(@Param('id') id: string, @Req() req: Request) {
    return this.itService.deleteRouting(id, (req as any).user);
  }
}