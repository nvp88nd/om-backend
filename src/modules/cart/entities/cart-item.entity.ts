import { Entity, ManyToOne, JoinColumn, Column, PrimaryColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../product/entities/product-variant.entity';

@Entity('cart_items')
export class CartItem {
    @PrimaryColumn({ type: 'char', length: 36 })
    cart_id: string;

    @PrimaryColumn({ type: 'char', length: 36 })
    variant_id: string;

    @ManyToOne(() => Cart, c => c.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart: Cart;

    @ManyToOne(() => ProductVariant)
    @JoinColumn({ name: 'variant_id' })
    variant: ProductVariant;

    @Column({ type: 'int' })
    quantity: number;
}
