import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FieldReportStatus } from '@omniops/shared';

export class UpdateFieldReportStatusDto {
  @IsEnum(FieldReportStatus)
  status!: FieldReportStatus;
}
