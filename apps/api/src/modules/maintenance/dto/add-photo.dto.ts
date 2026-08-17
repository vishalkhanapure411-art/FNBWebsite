import { IsString, IsOptional } from 'class-validator';

export class AddPhotoDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
