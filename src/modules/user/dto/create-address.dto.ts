import { IsNotEmpty, IsString, IsPhoneNumber, IsNumber, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  receiver_name: string;

  @IsNotEmpty()
  @IsPhoneNumber('VN')
  receiver_phone: string;

  @IsNotEmpty()
  @IsString()
  province: string;

  @IsNotEmpty()
  @IsString()
  district: string;

  @IsNotEmpty()
  @IsString()
  ward: string;

  @IsNotEmpty()
  @IsString()
  detail_address: string;

  @IsOptional()
  @IsNumber()
  is_default?: number;
}
