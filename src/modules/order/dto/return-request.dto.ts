import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum ReturnRequestDecision {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export class CreateReturnRequestDto {
    @IsUUID()
    @IsNotEmpty()
    order_item_id: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    reason: string;
}

export class ReviewReturnRequestDto {
    @IsEnum(ReturnRequestDecision)
    decision: ReturnRequestDecision;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    note?: string;
}