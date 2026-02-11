import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn
} from 'typeorm';
import { OrderShop } from './order-shop.entity';
import { ProductVariant } from '../../product/entities/product-variant.entity';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => OrderShop, os => os.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_shop_id' })
    orderShop: OrderShop;

    @ManyToOne(() => ProductVariant)
    @JoinColumn({ name: 'variant_id' })
    variant: ProductVariant;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price: number;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    subtotal: number;
}
