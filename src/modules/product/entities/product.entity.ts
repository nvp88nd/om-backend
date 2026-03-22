import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, OneToMany, CreateDateColumn
} from 'typeorm';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { Shop } from '../../shop/entities/shop.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Shop)
    @JoinColumn({ name: 'shop_id' })
    shop: Shop;

    @ManyToOne(() => Category)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 255 })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    base_price: number;

    @Column({ type: 'tinyint', default: 0 })
    status: number;
    // 0 draft, 1 pending, 2 approved, 3 rejected

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => ProductVariant, v => v.product)
    variants: ProductVariant[];

    @OneToMany(() => ProductImage, img => img.product)
    images: ProductImage[];
}
