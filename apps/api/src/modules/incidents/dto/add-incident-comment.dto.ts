import { IsString, IsNotEmpty } from 'class-validator';

export class AddIncidentCommentDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}
