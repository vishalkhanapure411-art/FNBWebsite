import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import {
  SalesSummaryQueryDto,
  SalesRealtimeQueryDto,
  MenuPerformanceQueryDto,
  CostsQueryDto,
  ReportExportQueryDto,
  BenchmarkingQueryDto,
} from './dto/analytics-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, TENANT_ADMIN_ROLES } from '@omniops/shared';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales/summary')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Get sales summary with period breakdown' })
  getSalesSummary(@Query() query: SalesSummaryQueryDto, @Req() req: Request) {
    return this.analyticsService.getSalesSummary(query, req.user as any);
  }

  @Get('sales/realtime')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Get realtime today stats' })
  getRealtime(@Query() query: SalesRealtimeQueryDto, @Req() req: Request) {
    return this.analyticsService.getRealtime(query, req.user as any);
  }

  @Get('menu/performance')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD, Role.FOH)
  @ApiOperation({ summary: 'Get menu item performance analytics' })
  getMenuPerformance(@Query() query: MenuPerformanceQueryDto, @Req() req: Request) {
    return this.analyticsService.getMenuPerformance(query, req.user as any);
  }

  @Get('costs')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Get food and labor cost analytics' })
  getCosts(@Query() query: CostsQueryDto, @Req() req: Request) {
    return this.analyticsService.getCosts(query, req.user as any);
  }

  @Get('reports/export')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Export analytics report as CSV or JSON' })
  async exportReport(
    @Query() query: ReportExportQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.analyticsService.exportReport(query, req.user as any);

    const contentType = result.format === 'json' ? 'application/json' : 'text/csv';
    const disposition = `attachment; filename="${result.filename}"`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', disposition);

    if (result.format === 'json') {
      res.json(result.data);
    } else {
      res.send(result.data);
    }
  }

  @Get('benchmarking')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, ...TENANT_ADMIN_ROLES)
  @ApiOperation({ summary: 'Cross-site benchmarking comparison' })
  getBenchmarking(@Query() query: BenchmarkingQueryDto, @Req() req: Request) {
    return this.analyticsService.getBenchmarking(query, req.user as any);
  }
}
