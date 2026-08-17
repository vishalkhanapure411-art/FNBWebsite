import { IsString, IsOptional, IsArray, ArrayMinSize, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  playlistId: string;

  @IsOptional()
  @IsString()
  contentId?: string;

  @IsString()
  siteId: string;

  @IsArray()
  @ArrayMinSize(0)
  dayOfWeek: number[];

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm format' })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:mm format' })
  endTime: string;
}
