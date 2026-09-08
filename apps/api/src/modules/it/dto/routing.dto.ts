import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { Station } from '@omniops/shared';

export class CreateRoutingDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @IsEnum(Station)
  station!: Station;

  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsOptional()
  @IsString()
  printerId?: string;
}

export class UpdateRoutingDto {
  @IsOptional()
  @IsEnum(Station)
  station?: Station;

  @IsOptional()
  @IsString()
  printerId?: string | null;
}

export class RoutingsQueryDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  station?: string;

  @IsOptional()
  @IsString()
  menuItemId?: string;
}