import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

export class ProcessWithdrawalDto {
  @IsNumber()
  status: number;

  @IsOptional()
  @IsString()
  note?: string;
}
