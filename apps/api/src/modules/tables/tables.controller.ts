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
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto, TableStatusDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

@ApiTags('Tables')
@Controller('tables')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create a table in a floor plan' })
  create(@Body() dto: CreateTableDto, @Req() req: Request) {
    return this.tablesService.create(dto, req.user as any);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List tables for a site/floor plan with status' })
  findAll(
    @Query('siteId') siteId: string,
    @Query('floorPlanId') floorPlanId: string,
    @Req() req: Request,
  ) {
    return this.tablesService.findAll({ siteId, floorPlanId }, req.user as any);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update table details/position' })
  update(@Param('id') id: string, @Body() dto: UpdateTableDto, @Req() req: Request) {
    return this.tablesService.update(id, dto, req.user as any);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Delete a table' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.tablesService.remove(id, req.user as any);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Quick status change for a table' })
  updateStatus(@Param('id') id: string, @Body() dto: TableStatusDto, @Req() req: Request) {
    return this.tablesService.updateStatus(id, dto, req.user as any);
  }
}
