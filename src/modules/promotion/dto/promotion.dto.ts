import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum PromotionType {
  PRODUCT = 1,
  SHOP = 2,
  SYSTEM = 3,
}

export enum PromotionDiscountType {
  PERCENTAGE = 1,
  FIXED_AMOUNT = 2,
}

export enum PromotionTimeStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  EXPIRED = 'expired',
  INACTIVE = 'inactive',
}

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
};

const normalizeCode = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toUpperCase();
};

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @Transform(normalizeCode)
  @IsString()
  code?: string;

  @IsEnum(PromotionType)
  @IsNotEmpty()
  @Type(() => Number)
  type: PromotionType;

  @IsEnum(PromotionDiscountType)
  @IsNotEmpty()
  @Type(() => Number)
  discount_type: PromotionDiscountType;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  discount_value: number;

  @IsDateString()
  @IsNotEmpty()
  start_at: string;

  @IsDateString()
  @IsNotEmpty()
  end_at: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_order_value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_discount_value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_user_limit?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID('4')
  shop_id?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  product_ids?: string[];
}

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @Transform(normalizeCode)
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(PromotionType)
  @Type(() => Number)
  type?: PromotionType;

  @IsOptional()
  @IsEnum(PromotionDiscountType)
  @Type(() => Number)
  discount_type?: PromotionDiscountType;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  discount_value?: number;

  @IsDateString()
  @IsOptional()
  start_at?: string;

  @IsDateString()
  @IsOptional()
  end_at?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_order_value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_discount_value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_user_limit?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID('4')
  shop_id?: string | null;

  @IsOptional()
  @IsUUID('4', { each: true })
  product_ids?: string[];
}

export class PromotionFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(PromotionType)
  @Type(() => Number)
  type?: PromotionType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4')
  shop_id?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsEnum(PromotionTimeStatus)
  status?: PromotionTimeStatus;
}
