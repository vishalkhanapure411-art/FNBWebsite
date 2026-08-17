import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, MinLength, MaxLength } from 'class-validator';
import { MenuType } from '@omniops/shared';

export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(MenuType)
  menuType?: MenuType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  availabilitySchedule?: Record<string, unknown>;
}
