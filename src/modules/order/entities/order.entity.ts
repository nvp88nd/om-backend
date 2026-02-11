import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, OneToMany, CreateDateColumn
} from 'typeorm';
import { OrderShop } from './order-shop.entity';
import { Payment } from './payment.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    total_amount: number;

    @Column({ type: 'smallint' })
    status: number;

    @Column({ length: 50 })
    payment_method: string;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => OrderShop, os => os.order)
    orderShops: OrderShop[];

    @OneToMany(() => Payment, p => p.order)
    payments: Payment[];
}
