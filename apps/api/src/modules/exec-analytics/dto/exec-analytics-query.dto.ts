import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ExecAnalyticsGranularity {
  DAY = 'day',
  WEEK = 'week',
}

export class ExecAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Tenant ID to scope the query (SUPER_ADMIN only; defaults to first tenant). Brand managers are always scoped to their own tenant.' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601). Defaults to 30 days ago.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601). Defaults to now.' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ExecAnalyticsGranularity, description: 'Granularity of the revenue trend series. Defaults to day (week when the range exceeds 92 days).' })
  @IsOptional()
  @IsEnum(ExecAnalyticsGranularity)
  granularity?: ExecAnalyticsGranularity;
}
