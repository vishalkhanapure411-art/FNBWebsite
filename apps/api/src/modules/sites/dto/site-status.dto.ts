import { IsEnum } from 'class-validator';
import { SiteStatus } from '@omniops/shared';

export class SiteStatusDto {
  @IsEnum(SiteStatus)
  status: SiteStatus;
}
