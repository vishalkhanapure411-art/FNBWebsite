import { IsString, IsOptional, IsNotEmpty, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { DeviceType } from '@prisma/client';
import { Station } from '@omniops/shared';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(DeviceType)
  type!: DeviceType;

  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsOptional()
  @IsEnum(Station)
  station?: Station;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;

  @IsOptional()
  @IsEnum(Station)
  station?: Station | null;

  @IsOptional()
  @IsString()
  ipAddress?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsDateString()
  lastHeartbeat?: string;
}

export class DevicesQueryDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}