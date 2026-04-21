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

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    discount_amount: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    shipping_fee: number;

    @Column({ type: 'char', length: 36, nullable: true })
    promotion_id?: string;

    @Column({ type: 'smallint' })
    status: number;

    @Column({ length: 50 })
    payment_method: string;

    @Column({ type: 'char', length: 36, nullable: true })
    shipping_address_id?: string | null;

    @Column({ type: 'varchar', length: 150, nullable: true })
    shipping_receiver_name?: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    shipping_receiver_phone?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    shipping_province?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    shipping_district?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    shipping_ward?: string | null;

    @Column({ type: 'text', nullable: true })
    shipping_detail_address?: string | null;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => OrderShop, os => os.order)
    orderShops: OrderShop[];

    @OneToMany(() => Payment, p => p.order)
    payments: Payment[];
}
