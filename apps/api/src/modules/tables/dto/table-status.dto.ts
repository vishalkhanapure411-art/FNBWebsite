import { IsString } from 'class-validator';
import { TableStatus } from '@omniops/shared';

export class TableStatusDto {
  @IsString()
  status!: TableStatus;
}
