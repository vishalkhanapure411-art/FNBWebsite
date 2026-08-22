import { IsEnum } from 'class-validator';
import { IncidentStatus } from '@omniops/shared';

export class UpdateIncidentStatusDto {
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;
}
