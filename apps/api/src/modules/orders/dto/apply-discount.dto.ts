import { IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { DiscountType } from '@omniops/shared';

export class ApplyDiscountDto {
  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
