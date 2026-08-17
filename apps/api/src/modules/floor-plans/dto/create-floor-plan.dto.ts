import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateFloorPlanDto {
  @IsString()
  siteId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
