import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldReportStatus, FieldReportSeverity, FieldReportCategory } from '@omniops/shared';

export class ListFieldReportsQueryDto {
  @IsOptional()
  @IsString()
  siteId?: string;
  @IsOptional()
  @IsEnum(FieldReportStatus)
  status?: FieldReportStatus;
  @IsOptional()
  @IsEnum(FieldReportSeverity)
  severity?: FieldReportSeverity;
  @IsOptional()
  @IsEnum(FieldReportCategory)
  category?: FieldReportCategory;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
