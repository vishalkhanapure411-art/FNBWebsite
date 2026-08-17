import { IsString } from 'class-validator';

export class TicketStatusDto {
  @IsString()
  status!: string;
}
