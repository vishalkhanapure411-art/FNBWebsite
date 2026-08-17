import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
  MinLength,
  MaxLength,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, OrderChannel, PaymentMethod } from '@omniops/shared';

class OrderItemModifierDto {
  @IsString()
  modifierName: string;

  @IsOptional()
  @IsNumber()
  priceAdjustment?: number;
}

class CreateOrderItemDto {
  @IsString()
  menuItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemModifierDto)
  modifiers?: OrderItemModifierDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class OrderPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsObject()
  gatewayData?: Record<string, unknown>;
}

export class CreateOrderDto {
  @IsString()
  siteId: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @IsEnum(OrderChannel)
  channel?: OrderChannel;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderPaymentDto)
  payment?: OrderPaymentDto;
}
