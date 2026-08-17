import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { SignageMediaType } from '@omniops/shared';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SignageMediaType)
  mediaType: SignageMediaType;

  @IsString()
  mediaUrl: string;

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
