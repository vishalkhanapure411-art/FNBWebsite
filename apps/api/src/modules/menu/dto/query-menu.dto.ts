import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { MenuType } from '@omniops/shared';

export class QueryMenuDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsEnum(MenuType)
  menuType?: MenuType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
