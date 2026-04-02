import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto, SendMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  createRoom(@CurrentUser('id') userId: string, @Body() dto: CreateRoomDto) {
    return this.chatService.getOrCreateRoom(userId, dto.shop_id);
  }

  @Get('rooms')
  getRooms(@CurrentUser('id') userId: string) {
    return this.chatService.getRoomsForUser(userId);
  }

  @Get('rooms/:id/messages')
  getMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) roomId: string
  ) {
    return this.chatService.getMessages(roomId, userId);
  }

  @Patch('rooms/:id/read')
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) roomId: string
  ) {
    return this.chatService.markAsRead(roomId, userId);
  }

  @Post('messages')
  sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.saveMessage(userId, dto);
  }
}
