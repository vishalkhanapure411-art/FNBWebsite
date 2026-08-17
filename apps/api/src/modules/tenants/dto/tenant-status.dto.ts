import { IsEnum } from 'class-validator';
import { TenantStatus } from '@omniops/shared';

export class TenantStatusDto {
  @IsEnum(TenantStatus)
  status: TenantStatus;
}
