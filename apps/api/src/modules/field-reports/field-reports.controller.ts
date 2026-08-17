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
import { FieldReportsService } from './field-reports.service';
import {
  CreateFieldReportDto,
  UpdateFieldReportStatusDto,
  AddFieldReportCommentDto,
  ListFieldReportsQueryDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

// Field staff submit reports; management reviews them.
const FIELD_STAFF_ROLES = [
  Role.SUPER_ADMIN,
  Role.BRAND_MANAGER,
  Role.SITE_LEAD,
  Role.MAINTENANCE_TECH,
  Role.QUALITY_AUDITOR,
];
const MANAGEMENT_ROLES = [Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD];

@ApiTags('Field Reports')
@Controller('field-reports')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class FieldReportsController {
  constructor(private readonly fieldReportsService: FieldReportsService) {}

  @Post()
  @Roles(...FIELD_STAFF_ROLES)
  @ApiOperation({ summary: 'Submit a field report for a site' })
  create(@Body() dto: CreateFieldReportDto, @Req() req: Request) {
    return this.fieldReportsService.create(dto, (req as any).user);
  }

  @Get()
  @Roles(...FIELD_STAFF_ROLES)
  @ApiOperation({ summary: 'List field reports (tenant-scoped; siteId optional)' })
  list(@Query() query: ListFieldReportsQueryDto, @Req() req: Request) {
    return this.fieldReportsService.list(query, (req as any).user);
  }

  @Patch(':id/status')
  @Roles(...MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'Transition report status (NEW→REVIEWED→ACTIONED, or →DISMISSED)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFieldReportStatusDto, @Req() req: Request) {
    return this.fieldReportsService.updateStatus(id, dto, (req as any).user);
  }

  @Post(':id/comments')
  @Roles(...FIELD_STAFF_ROLES)
  @ApiOperation({ summary: 'Add a comment to a field report' })
  addComment(@Param('id') id: string, @Body() dto: AddFieldReportCommentDto, @Req() req: Request) {
    return this.fieldReportsService.addComment(id, dto, (req as any).user);
  }
}
