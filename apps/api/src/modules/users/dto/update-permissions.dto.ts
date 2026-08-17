import { IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePermissionsDto {
  @ApiPropertyOptional({ description: 'Override all permissions — set to true for full access' })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiProperty({ description: 'Granular permission key-value pairs', example: { ORDER_READ: true, ORDER_CREATE: false } })
  @IsObject()
  permissions: Record<string, boolean>;
}
