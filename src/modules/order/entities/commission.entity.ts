import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OrderShop } from './order-shop.entity';
import { Shop } from '../../shop/entities/shop.entity';

@Entity('commissions')
export class Commission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Shop)
    @JoinColumn({ name: 'shop_id' })
    shop: Shop;

    @ManyToOne(() => OrderShop)
    @JoinColumn({ name: 'order_shop_id' })
    orderShop: OrderShop;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    rate: number;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    amount: number;
}
