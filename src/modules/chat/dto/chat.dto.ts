import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  room_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  message_type: string = 'text';
}

export class CreateRoomDto {
  @IsUUID()
  @IsNotEmpty()
  shop_id: string;
}
