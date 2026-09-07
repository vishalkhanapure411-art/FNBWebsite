import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { IndentStatus } from '@prisma/client';

export class CreateIndentDto {
  @IsString()
  @IsNotEmpty()
  menuPlanId!: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class IndentsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  siteId?: string;
}

export class IndentStatusDto {
  @IsOptional()
  @IsString()
  label?: string;
}