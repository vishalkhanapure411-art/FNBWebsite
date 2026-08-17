import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AnomalyCategory {
  MISSING_PAYMENT = 'MISSING_PAYMENT',
  VOID_REFUND_SPIKE = 'VOID_REFUND_SPIKE',
  DISCOUNT_OUTLIER = 'DISCOUNT_OUTLIER',
  PAYMENT_MISMATCH = 'PAYMENT_MISMATCH',
  NO_SALE = 'NO_SALE',
}

export enum AnomalySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class RevenueAssuranceQueryDto {
  @ApiPropertyOptional({ description: 'Site ID (required for non-SUPER_ADMIN)' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601). Defaults to 30 days ago.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601). Defaults to now.' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: AnomalyCategory, description: 'Filter by anomaly category' })
  @IsOptional()
  @IsEnum(AnomalyCategory)
  category?: AnomalyCategory;

  @ApiPropertyOptional({ enum: AnomalySeverity, description: 'Filter by severity' })
  @IsOptional()
  @IsEnum(AnomalySeverity)
  severity?: AnomalySeverity;
}

export class AnomalyListQueryDto extends RevenueAssuranceQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
