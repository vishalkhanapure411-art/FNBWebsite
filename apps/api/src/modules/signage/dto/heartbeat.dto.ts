import { IsString } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  deviceId: string;

  @IsString()
  siteId: string;
}
