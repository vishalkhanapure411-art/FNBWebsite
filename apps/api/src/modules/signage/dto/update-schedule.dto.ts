import { IsString, IsOptional, IsArray, IsBoolean, Matches } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  playlistId?: string;

  @IsOptional()
  @IsString()
  contentId?: string;

  @IsOptional()
  @IsArray()
  dayOfWeek?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
