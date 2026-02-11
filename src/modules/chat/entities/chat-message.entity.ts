import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, CreateDateColumn
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('chat_messages')
export class ChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ChatRoom, r => r.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'room_id' })
    room: ChatRoom;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @Column({ length: 20 })
    message_type: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'boolean', default: false })
    is_read: boolean;

    @CreateDateColumn()
    created_at: Date;
}
