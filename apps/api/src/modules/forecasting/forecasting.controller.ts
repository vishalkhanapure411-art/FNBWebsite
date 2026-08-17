import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ForecastingService } from './forecasting.service';
import { ForecastingQueryDto } from './dto/forecasting-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

/**
 * DEMAND FORECASTING — site-scoped statistical forecast of daily revenue and
 * orders. Same access pattern as the site-level analytics / revenue-assurance
 * modules: SITE_LEAD, BRAND_MANAGER and SUPER_ADMIN may read; non-super users
 * are pinned to their own tenant via the site lookup, SUPER_ADMIN passes an
 * explicit siteId to query any site.
 */
@ApiTags('Forecasting')
@Controller('forecasting')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  @Get('demand')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({
    summary:
      'AI-assisted demand forecast: daily revenue + orders per site (statistical model: weekday seasonality + dampened linear trend) with confidence bounds',
  })
  getDemand(@Query() query: ForecastingQueryDto, @Req() req: Request) {
    return this.forecastingService.getDemand(query, req.user as any);
  }
}
