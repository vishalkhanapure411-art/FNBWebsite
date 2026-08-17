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
import { FloorPlansService } from './floor-plans.service';
import { CreateFloorPlanDto, UpdateFloorPlanDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

@ApiTags('Floor Plans')
@Controller('floor-plans')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class FloorPlansController {
  constructor(private readonly floorPlansService: FloorPlansService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Create a floor plan for a site' })
  create(@Body() dto: CreateFloorPlanDto, @Req() req: Request) {
    return this.floorPlansService.create(dto, req.user as any);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List floor plans for a site' })
  findAll(@Query('siteId') siteId: string, @Req() req: Request) {
    return this.floorPlansService.findAll(siteId, req.user as any);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Update floor plan details/layout' })
  update(@Param('id') id: string, @Body() dto: UpdateFloorPlanDto, @Req() req: Request) {
    return this.floorPlansService.update(id, dto, req.user as any);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Delete floor plan (cascade unlink tables)' })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.floorPlansService.remove(id, req.user as any);
  }
}
