import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { OrderStatus, OrderType } from '@omniops/shared';

export class QueryOrdersDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
