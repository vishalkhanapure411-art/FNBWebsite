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
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentDto,
  UpdateIncidentStatusDto,
  AddIncidentCommentDto,
  ListIncidentsQueryDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES, IncidentDepartment } from '@omniops/shared';

// Assurance departments (can read AND write their department's tickets) plus SUPER_ADMIN.
const DEPT_ROLES = [
  Role.SUPER_ADMIN,
  Role.QUALITY_AUDITOR,
  Role.REVENUE_ASSURANCE,
  Role.MAINTENANCE_ASSURANCE,
  Role.CONTROLS,
];
// Management roles get read-only visibility via ?scope=all.
const READ_ALL_ROLES = [
  Role.SUPER_ADMIN,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
];
const READ_ROLES = [
  ...DEPT_ROLES,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
];

@ApiTags('Incidents')
@Controller('incidents')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @Roles(...DEPT_ROLES)
  @ApiOperation({ summary: 'Create an incident ticket (auto ticketNumber + SLA; dept/site enforced)' })
  create(@Body() dto: CreateIncidentDto, @Req() req: Request) {
    return this.incidentsService.create(dto, (req as any).user);
  }

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List incident tickets (row-level security: dept+site scoped; ?scope=all for management)' })
  list(@Query() query: ListIncidentsQueryDto, @Req() req: Request) {
    return this.incidentsService.list(query, (req as any).user);
  }

  @Get('categories')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: '3-level category tree for a department (read-only, any dept user may fetch any dept)' })
  categories(@Query('department') department: IncidentDepartment, @Req() req: Request) {
    return this.incidentsService.getCategories(department, (req as any).user);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single ticket (RLS applied)' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.incidentsService.findOne(id, (req as any).user);
  }

  @Patch(':id/status')
  @Roles(...DEPT_ROLES)
  @ApiOperation({ summary: 'Transition ticket status (validated; sets SLA timestamps + history comment)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateIncidentStatusDto, @Req() req: Request) {
    return this.incidentsService.updateStatus(id, dto, (req as any).user);
  }

  @Post(':id/comments')
  @Roles(...DEPT_ROLES)
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  addComment(@Param('id') id: string, @Body() dto: AddIncidentCommentDto, @Req() req: Request) {
    return this.incidentsService.addComment(id, dto, (req as any).user);
  }
}
