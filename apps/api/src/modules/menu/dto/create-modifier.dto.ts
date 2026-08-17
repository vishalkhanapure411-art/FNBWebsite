import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, MinLength, MaxLength } from 'class-validator';

export class CreateModifierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
