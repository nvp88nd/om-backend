import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';
import { JwtService } from '@nestjs/jwt';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust according to your frontend URL
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      
      // Join a private room for the user to receive global notifications if needed
      client.join(`user_${payload.id}`);
      
      console.log(`Client connected: ${client.id} (User: ${payload.id})`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('room_id') roomId: string,
  ) {
    client.join(roomId);
    return { event: 'joined_room', data: roomId };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('room_id') roomId: string,
  ) {
    client.leave(roomId);
    return { event: 'left_room', data: roomId };
  }

  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe())
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.data.user.id;
    const message = await this.chatService.saveMessage(userId, dto);

    // Broadcast message to everyone in the room
    this.server.to(dto.room_id).emit('new_message', message);
    
    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room_id: string; is_typing: boolean },
  ) {
    const userId = client.data.user.id;
    client.to(data.room_id).emit('user_typing', {
      user_id: userId,
      is_typing: data.is_typing,
    });
  }
}
