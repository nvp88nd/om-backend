import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('withdrawals')
export class Withdrawal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shop_id: string;

    @Column('decimal', { precision: 14, scale: 2 })
    amount: number;

    @Column({ type: 'tinyint', default: 0 })
    status: number;

    @Column({ nullable: true })
    processed_by: string;

    @CreateDateColumn()
    created_at: Date;
}