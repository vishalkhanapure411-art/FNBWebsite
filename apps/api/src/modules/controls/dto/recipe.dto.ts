import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
  IsBoolean,
} from 'class-validator';
import { IngredientUnit } from '@omniops/shared';

export class RecipeIngredientLineDto {
  @IsString()
  @IsNotEmpty()
  ingredientId!: string;

  @IsNumber()
  @Min(0)
  qty!: number;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;
}

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  yieldQty?: number;

  @IsArray()
  @ArrayMinSize(1)
  lines!: RecipeIngredientLineDto[];
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  yieldQty?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  lines!: RecipeIngredientLineDto[];
}
