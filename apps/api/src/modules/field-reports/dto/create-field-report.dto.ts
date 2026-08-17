import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FieldReportCategory, FieldReportSeverity } from '@omniops/shared';

export class CreateFieldReportDto {
  @IsString()
  siteId!: string;
  @IsEnum(FieldReportCategory)
  category!: FieldReportCategory;
  @IsEnum(FieldReportSeverity)
  severity!: FieldReportSeverity;
  @IsString()
  title!: string;
  @IsString()
  description!: string;
}
