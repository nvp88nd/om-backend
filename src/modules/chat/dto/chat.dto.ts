import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  room_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  message_type: string = 'text';
}

export class CreateRoomDto {
  @IsUUID()
  @IsNotEmpty()
  shop_id: string;
}
