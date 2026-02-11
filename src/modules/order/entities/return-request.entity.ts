import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, CreateDateColumn
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('return_requests')
export class ReturnRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => OrderItem)
    @JoinColumn({ name: 'order_item_id' })
    orderItem: OrderItem;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'text' })
    reason: string;

    @Column({ type: 'smallint' })
    status: number;

    @CreateDateColumn()
    created_at: Date;
}
