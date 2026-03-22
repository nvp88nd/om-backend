import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsString()
  variant_id: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @IsNotEmpty()
  @IsString()
  variant_id: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
