import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costEstimate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;
}
