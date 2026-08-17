import { IsEnum } from 'class-validator';
import { OrderStatus } from '@omniops/shared';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
