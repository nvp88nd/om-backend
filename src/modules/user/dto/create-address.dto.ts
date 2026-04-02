import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  IsNumber,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  receiver_name: string;

  @ValidateIf((obj) => !obj.phone_number)
  @IsNotEmpty()
  @IsPhoneNumber('VN')
  receiver_phone?: string;

  @ValidateIf((obj) => !obj.receiver_phone)
  @IsNotEmpty()
  @IsPhoneNumber('VN')
  phone_number?: string;

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
