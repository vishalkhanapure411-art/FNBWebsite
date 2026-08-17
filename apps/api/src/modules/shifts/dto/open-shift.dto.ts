import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class OpenShiftDto {
  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingCash?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
