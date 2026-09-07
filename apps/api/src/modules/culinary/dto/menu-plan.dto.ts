import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { MenuPlanStatus, MealSlot } from '@prisma/client';

export class CreateMenuPlanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMenuPlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(MenuPlanStatus)
  status?: MenuPlanStatus;
}

export class PlanItemDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  dayIndex?: number;

  @IsOptional()
  @IsEnum(MealSlot)
  mealSlot?: MealSlot;

  @IsOptional()
  @IsInt()
  @Min(1)
  plannedQty?: number;
}

export class ReplacePlanItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  items!: PlanItemDto[];
}

export class PlansQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  siteId?: string;
}