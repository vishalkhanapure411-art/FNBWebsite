import { IsOptional, IsString } from 'class-validator';

export class AssignTicketDto {
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;
}
