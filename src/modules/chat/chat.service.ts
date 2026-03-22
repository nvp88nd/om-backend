import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Shop } from '../shop/entities/shop.entity';
import { SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
  ) {}

  async getOrCreateRoom(customerId: string, shopId: string) {
    let room = await this.roomRepository.findOne({
      where: { customer: { id: customerId }, shop: { id: shopId } },
      relations: ['shop', 'customer'],
    });

    if (!room) {
      const shop = await this.shopRepository.findOne({ where: { id: shopId } });
      if (!shop) throw new NotFoundException('Shop not found');

      room = this.roomRepository.create({
        customer: { id: customerId } as any,
        shop: shop,
      });
      await this.roomRepository.save(room);
    }

    return room;
  }

  async getRoomsForUser(userId: string) {
    // Return rooms where user is either customer or shop owner
    const shop = await this.shopRepository.findOne({ where: { owner: { id: userId } } });
    
    const query = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.customer', 'customer')
      .leftJoinAndSelect('room.shop', 'shop')
      .leftJoinAndSelect('room.messages', 'message')
      .orderBy('message.created_at', 'DESC');

    if (shop) {
      query.where('room.customer_id = :userId OR room.shop_id = :shopId', { userId, shopId: shop.id });
    } else {
      query.where('room.customer_id = :userId', { userId });
    }

    return query.getMany();
  }

  async getMessages(roomId: string, userId: string) {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['shop', 'shop.owner', 'customer'],
    });

    if (!room) throw new NotFoundException('Room not found');

    // Check if user is part of the room
    if (room.customer.id !== userId && room.shop.owner.id !== userId) {
      throw new ForbiddenException('You are not part of this chat room');
    }

    return this.messageRepository.find({
      where: { room: { id: roomId } },
      relations: ['sender'],
      order: { created_at: 'ASC' },
    });
  }

  async saveMessage(userId: string, dto: SendMessageDto) {
    const { room_id, content, message_type } = dto;
    const room = await this.roomRepository.findOne({
      where: { id: room_id },
      relations: ['shop', 'shop.owner', 'customer'],
    });

    if (!room) throw new NotFoundException('Room not found');

    if (room.customer.id !== userId && room.shop.owner.id !== userId) {
      throw new ForbiddenException('You are not allowed to send messages to this room');
    }

    const message = this.messageRepository.create({
      room: { id: room_id } as any,
      sender: { id: userId } as any,
      content,
      message_type,
    });

    return this.messageRepository.save(message);
  }

  async markAsRead(roomId: string, userId: string) {
    await this.messageRepository
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ is_read: true })
      .where('room_id = :roomId AND sender_id != :userId', { roomId, userId })
      .execute();
    
    return { success: true };
  }
}
