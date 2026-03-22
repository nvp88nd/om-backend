import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('shop_warnings')
export class ShopWarning {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shop_id: string;

    @Column()
    reason: string;

    @Column({ type: 'tinyint' })
    level: number;

    @CreateDateColumn()
    created_at: Date;
}