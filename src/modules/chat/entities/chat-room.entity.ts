import {
    Entity, PrimaryGeneratedColumn,
    ManyToOne, JoinColumn, CreateDateColumn, Unique, OneToMany
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { Shop } from '../../shop/entities/shop.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('chat_rooms')
@Unique(['shop', 'customer'])
export class ChatRoom {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Shop)
    @JoinColumn({ name: 'shop_id' })
    shop: Shop;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'customer_id' })
    customer: User;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => ChatMessage, m => m.room)
    messages: ChatMessage[];
}
