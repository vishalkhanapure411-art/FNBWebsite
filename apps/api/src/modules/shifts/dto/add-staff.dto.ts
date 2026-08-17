import { IsString } from 'class-validator';

export class AddStaffDto {
  @IsString()
  userId!: string;
}
