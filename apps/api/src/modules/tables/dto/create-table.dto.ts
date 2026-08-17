import { IsString, IsOptional, IsNumber, IsObject, Min } from 'class-validator';

export class CreateTableDto {
  @IsString()
  floorPlanId!: string;

  @IsString()
  siteId!: string;

  @IsString()
  number!: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsObject()
  position?: { x: number; y: number; w: number; h: number };
}
