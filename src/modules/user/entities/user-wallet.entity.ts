import { Entity, Column, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('user_wallets')
export class UserWallet {
    @PrimaryColumn({ type: 'char', length: 36 })
    user_id: string;

    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    balance: number;

    @UpdateDateColumn({ type: 'datetime' })
    updated_at: Date;
}
