import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum PromotionType {
  PRODUCT = 1,
  SHOP = 2,
  SYSTEM = 3,
}

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PromotionType)
  @IsNotEmpty()
  type: PromotionType;

  @IsNumber()
  @Min(0)
  @Max(100)
  discount_value: number; // Percentage

  @IsDateString()
  @IsNotEmpty()
  start_at: string;

  @IsDateString()
  @IsNotEmpty()
  end_at: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  product_ids?: string[];
}

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount_value?: number;

  @IsDateString()
  @IsOptional()
  start_at?: string;

  @IsDateString()
  @IsOptional()
  end_at?: string;
}
