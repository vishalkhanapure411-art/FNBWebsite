import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AnalyticsGroupBy {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum ReportType {
  SALES = 'sales',
  MENU = 'menu',
  COSTS = 'costs',
}

export enum ReportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export enum MenuSortBy {
  REVENUE = 'revenue',
  QUANTITY = 'quantity',
  MARGIN = 'margin',
}

export class SalesSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Site ID (required for non-SUPER_ADMIN)' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: AnalyticsGroupBy, default: AnalyticsGroupBy.DAY })
  @IsOptional()
  @IsEnum(AnalyticsGroupBy)
  groupBy?: AnalyticsGroupBy = AnalyticsGroupBy.DAY;
}

export class SalesRealtimeQueryDto {
  @ApiPropertyOptional({ description: 'Site ID' })
  @IsOptional()
  @IsString()
  siteId?: string;
}

export class MenuPerformanceQueryDto {
  @ApiPropertyOptional({ description: 'Site ID' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Max items to return', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: MenuSortBy, default: MenuSortBy.REVENUE })
  @IsOptional()
  @IsEnum(MenuSortBy)
  sortBy?: MenuSortBy = MenuSortBy.REVENUE;
}

export class CostsQueryDto {
  @ApiPropertyOptional({ description: 'Site ID' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ReportExportQueryDto {
  @ApiPropertyOptional({ description: 'Site ID' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ enum: ReportType, description: 'Report type' })
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType = ReportType.SALES;

  @ApiPropertyOptional({ enum: ReportFormat, default: ReportFormat.CSV })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.CSV;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BenchmarkingQueryDto {
  @ApiPropertyOptional({ description: 'Tenant ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
