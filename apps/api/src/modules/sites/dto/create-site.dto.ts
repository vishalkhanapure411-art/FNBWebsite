import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { SiteType } from '@omniops/shared';

export class CreateSiteDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only, starting and ending with alphanumeric',
  })
  slug: string;

  @IsOptional()
  @IsEnum(SiteType)
  siteType?: SiteType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisine?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalEntity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxNumber?: string;

  @IsOptional()
  @IsObject()
  bankingDetails?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  siteConfig?: Record<string, unknown>;
}
