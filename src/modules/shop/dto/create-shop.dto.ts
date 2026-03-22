import { IsNotEmpty, IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateShopDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug only contains lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
