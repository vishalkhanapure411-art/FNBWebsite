import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { RevenueAssuranceService } from './revenue-assurance.service';
import {
  RevenueAssuranceQueryDto,
  AnomalyListQueryDto,
} from './dto/revenue-assurance-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

@ApiTags('Revenue Assurance')
@Controller('revenue-assurance')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class RevenueAssuranceController {
  constructor(private readonly revenueAssuranceService: RevenueAssuranceService) {}

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.REVENUE_ASSURANCE)
  @ApiOperation({ summary: 'Revenue assurance summary with anomaly breakdown by category' })
  getSummary(@Query() query: RevenueAssuranceQueryDto, @Req() req: Request) {
    return this.revenueAssuranceService.getSummary(query, req.user as any);
  }

  @Get('anomalies')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.REVENUE_ASSURANCE)
  @ApiOperation({ summary: 'Paged list of flagged revenue anomalies with filters' })
  getAnomalies(@Query() query: AnomalyListQueryDto, @Req() req: Request) {
    return this.revenueAssuranceService.getAnomalies(query, req.user as any);
  }
}
