import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, OneToMany
} from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Shop } from '../../shop/entities/shop.entity';

@Entity('order_shops')
export class OrderShop {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Order, o => o.orderShops, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @ManyToOne(() => Shop)
    @JoinColumn({ name: 'shop_id' })
    shop: Shop;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    subtotal: number;

    @Column({ type: 'smallint' })
    status: number;

    @OneToMany(() => OrderItem, i => i.orderShop)
    items: OrderItem[];
}
