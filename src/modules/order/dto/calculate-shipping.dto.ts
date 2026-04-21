import { IsString, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingCalculationItemDto {
    @IsString()
    shop_id: string;

    @IsNumber()
    item_count: number;

    @IsNumber()
    subtotal: number;
}

export class CalculateShippingDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ShippingCalculationItemDto)
    shops: ShippingCalculationItemDto[];

    @IsString()
    address_id: string;

    @IsOptional()
    @IsString()
    shipping_method?: string;
}

export class ShippingFeeResponseDto {
    shop_id: string;
    base_fee: number;
    distance_fee: number;
    total_fee: number;
}

export class CalculateShippingResponseDto {
    by_shop: Record<string, ShippingFeeResponseDto>;
    total_fee: number;
}
