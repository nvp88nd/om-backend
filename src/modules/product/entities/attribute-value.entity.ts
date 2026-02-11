import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Attribute } from './attribute.entity';

@Entity('attribute_values')
export class AttributeValue {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Attribute, a => a.values, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'attribute_id' })
    attribute: Attribute;

    @Column({ length: 100 })
    value: string;
}
