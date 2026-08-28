import { IsString, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateClosingPeriodDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class CogsQueryDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ClosingsQueryDto {
  @IsOptional()
  @IsString()
  siteId?: string;
}
