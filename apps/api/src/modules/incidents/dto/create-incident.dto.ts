import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import {
  IncidentDepartment,
  IncidentSeverity,
} from '@omniops/shared';

export class CreateIncidentDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsEnum(IncidentDepartment)
  department!: IncidentDepartment;

  // Bucket FKs — all optional; at least title + description are required.
  @IsOptional()
  @IsString()
  categoryLevel1Id?: string;

  @IsOptional()
  @IsString()
  categoryLevel2Id?: string;

  @IsOptional()
  @IsString()
  categoryLevel3Id?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
