import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, OneToMany
} from 'typeorm';
import { Product } from './product.entity';
import { VariantAttribute } from './variant-attribute.entity';

@Entity('product_variants')
export class ProductVariant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Product, p => p.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ length: 100, nullable: true })
    sku: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    price: number;

    @Column({ type: 'int' })
    stock: number;

    @OneToMany(() => VariantAttribute, va => va.variant)
    attributes: VariantAttribute[];
}
