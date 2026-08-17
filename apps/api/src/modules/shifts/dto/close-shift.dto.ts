import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingCash?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
