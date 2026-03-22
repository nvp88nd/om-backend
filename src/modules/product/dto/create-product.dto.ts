import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock: number;

  @IsArray()
  @IsString({ each: true })
  attribute_value_ids: string[];
}

export class CreateProductImageDto {
  @IsNotEmpty()
  @IsUrl()
  image_url: string;

  @IsOptional()
  @IsBoolean()
  is_main?: boolean;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  category_id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  base_price: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images: CreateProductImageDto[];
}
