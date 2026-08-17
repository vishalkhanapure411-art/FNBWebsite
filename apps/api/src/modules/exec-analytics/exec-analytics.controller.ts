import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ExecAnalyticsService } from './exec-analytics.service';
import { ExecAnalyticsQueryDto } from './dto/exec-analytics-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

/**
 * EXEC ANALYTICS — tenant-wide, cross-site analytics for executives.
 *
 * Role gate: SUPER_ADMIN + BRAND_MANAGER only. BRAND_MANAGER is this platform's
 * tenant-admin role (there is no TENANT_ADMIN in the Role enum); this mirrors
 * the site-level benchmarking endpoint which is also SUPER_ADMIN/BRAND_MANAGER.
 * SITE_LEAD and below get 403 — the site-level analytics module covers them.
 */
@ApiTags('Exec Analytics')
@Controller('exec-analytics')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ExecAnalyticsController {
  constructor(private readonly execAnalyticsService: ExecAnalyticsService) {}

  @Get('overview')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Tenant-wide KPIs: revenue, orders, anomalies, NPS + revenue trend' })
  getOverview(@Query() query: ExecAnalyticsQueryDto, @Req() req: Request) {
    return this.execAnalyticsService.getOverview(query, req.user as any);
  }

  @Get('site-comparison')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Per-site comparison with revenue and anomaly ranks' })
  getSiteComparison(@Query() query: ExecAnalyticsQueryDto, @Req() req: Request) {
    return this.execAnalyticsService.getSiteComparison(query, req.user as any);
  }
}
