import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity('promotions')
export class Promotion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'tinyint' })
    type: number; // 1 product, 2 shop, 3 system

    @Column('decimal', { precision: 5, scale: 2 })
    discount_value: number;

    @Column()
    start_at: Date;

    @Column()
    end_at: Date;
}