import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class WalletQueryDto {
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
  limit?: number = 20;
}

export class TopupWalletDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  reference_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class DebitWalletDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  reference_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
