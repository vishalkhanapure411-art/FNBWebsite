import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { SignageContentStatus } from '@omniops/shared';
import { Type } from 'class-transformer';

export class QueryContentDto {
  @IsOptional()
  @IsEnum(SignageContentStatus)
  status?: SignageContentStatus;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
