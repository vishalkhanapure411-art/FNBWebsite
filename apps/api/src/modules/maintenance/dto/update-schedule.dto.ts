import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { MaintenanceFrequency } from '@omniops/shared';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MaintenanceFrequency)
  frequency?: MaintenanceFrequency;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
