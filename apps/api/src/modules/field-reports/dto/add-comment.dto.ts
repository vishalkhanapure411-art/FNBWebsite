import { IsString } from 'class-validator';

export class AddFieldReportCommentDto {
  @IsString()
  body!: string;
}
