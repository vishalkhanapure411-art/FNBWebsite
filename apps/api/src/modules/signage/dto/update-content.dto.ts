import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { SignageMediaType } from '@omniops/shared';

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SignageMediaType)
  mediaType?: SignageMediaType;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  duration?: number;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  playlistId?: string;
}
