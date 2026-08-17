import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { SubscriptionTier } from '@omniops/shared';

export class CreateTenantDto {
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
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, boolean>;
}
