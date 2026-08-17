import { IsOptional, IsString } from 'class-validator';

export class StatusTransitionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
