import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateBannerDto {
  @IsUrl()
  @IsNotEmpty()
  image_url: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsNumber()
  @Min(0)
  status: number;
}

export class UpdateBannerDto {
  @IsUrl()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  status?: number;
}

export class CreateBannedKeywordDto {
  @IsString()
  @IsNotEmpty()
  keyword: string;
}
