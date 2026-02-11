import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { AttributeValue } from './attribute-value.entity';

@Entity('variant_attributes')
export class VariantAttribute {
    @PrimaryColumn({ type: 'char', length: 36 })
    variant_id: string;

    @PrimaryColumn({ type: 'char', length: 36 })
    attribute_value_id: string;

    @ManyToOne(() => ProductVariant, v => v.attributes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'variant_id' })
    variant: ProductVariant;

    @ManyToOne(() => AttributeValue)
    @JoinColumn({ name: 'attribute_value_id' })
    attributeValue: AttributeValue;
}
