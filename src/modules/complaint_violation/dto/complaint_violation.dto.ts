import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ComplaintStatus {
  PENDING = 0,
  PROCESSED = 1,
  REJECTED = 2,
}

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  target_type: string; // 'product', 'shop', 'user', 'review'

  @IsUUID()
  @IsNotEmpty()
  target_id: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateViolationDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  penalty: string;
}

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;
}
