import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { IngredientUnit } from '@omniops/shared';

export class CreateIngredientDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;

  @IsNumber()
  @Min(0)
  costPerUnit!: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateIngredientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(IngredientUnit)
  unit?: IngredientUnit;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
