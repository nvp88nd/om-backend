import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAdminLogDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  target_type: string;

  @IsUUID()
  @IsOptional()
  target_id?: string;
}
