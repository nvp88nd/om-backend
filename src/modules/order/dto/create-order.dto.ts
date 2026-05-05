import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  COD = 'COD',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  STRIPE = 'STRIPE',
  WALLET = 'WALLET',
}

export class OrderItemDto {
  @IsNotEmpty()
  @IsString()
  variant_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsNotEmpty()
  @IsString()
  shipping_address_id: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  promotion_codes?: string[];
}
