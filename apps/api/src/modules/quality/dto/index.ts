import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category!: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSectionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  sortOrder?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  sortOrder?: number;
}

export class CreateItemDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['PASS_FAIL', 'SCORE_1_5', 'TEMPERATURE', 'PHOTO_REQUIRED', 'YES_NO'])
  itemType!: 'PASS_FAIL' | 'SCORE_1_5' | 'TEMPERATURE' | 'PHOTO_REQUIRED' | 'YES_NO';

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  sortOrder?: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['PASS_FAIL', 'SCORE_1_5', 'TEMPERATURE', 'PHOTO_REQUIRED', 'YES_NO'])
  itemType?: 'PASS_FAIL' | 'SCORE_1_5' | 'TEMPERATURE' | 'PHOTO_REQUIRED' | 'YES_NO';

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  sortOrder?: number;
}

export class StartAuditDto {
  @IsString()
  siteId!: string;

  @IsString()
  templateId!: string;

  @IsString()
  title!: string;
}

export class RespondDto {
  @IsString()
  itemId!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class AuditStatusDto {
  @IsString()
  status!: string;
}

export class CreateCapaDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  assignedToId!: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  dueDate?: string;
}

export class UpdateCapaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED';

  @IsOptional()
  dueDate?: string;
}

export class ResolveCapaDto {
  @IsString()
  resolution!: string;
}
