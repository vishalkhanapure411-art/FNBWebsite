import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const FORECAST_HORIZONS = [7, 14, 30] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export class ForecastingQueryDto {
  @ApiPropertyOptional({
    description:
      'Site ID. Required for everyone (SITE_LEAD may omit it if their JWT carries siteId; SUPER_ADMIN must pass an explicit siteId to pick a site).',
  })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Forecast horizon in days', default: 14, enum: [7, 14, 30] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 30])
  horizon?: number = 14;
}
