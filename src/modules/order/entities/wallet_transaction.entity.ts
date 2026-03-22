import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('wallet_transactions')
export class WalletTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shop_id: string;

    @Column({ type: 'enum', enum: ['IN', 'OUT'] })
    type: string;

    @Column('decimal', { precision: 14, scale: 2 })
    amount: number;

    @Column()
    reference_id: string;

    @CreateDateColumn()
    created_at: Date;
}