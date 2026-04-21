import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Product, p => p.images, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ type: 'text' })
    image_url: string;

    @Column({ type: 'boolean', default: false })
    is_main: boolean;

    @CreateDateColumn()
    created_at: Date;
}
