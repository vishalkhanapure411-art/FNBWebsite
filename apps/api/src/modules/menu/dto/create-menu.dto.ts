import { IsString, IsOptional, IsEnum, IsObject, MinLength, MaxLength } from 'class-validator';
import { MenuType } from '@omniops/shared';

export class CreateMenuDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(MenuType)
  menuType?: MenuType;

  @IsString()
  tenantId: string;

  @IsOptional()
  @IsObject()
  availabilitySchedule?: Record<string, unknown>;
}
