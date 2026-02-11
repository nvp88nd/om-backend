import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn
} from 'typeorm';
import { Order } from './order.entity';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Order, o => o.payments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ length: 50 })
    provider: string;

    @Column({ type: 'smallint' })
    status: number;

    @Column({ length: 150, nullable: true })
    transaction_code: string;

    @Column({ type: 'timestamp', nullable: true })
    paid_at: Date;
}
