import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { MaintenanceFrequency } from '@omniops/shared';

export class CreateScheduleDto {
  @IsString()
  assetId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MaintenanceFrequency)
  frequency!: MaintenanceFrequency;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;
}
