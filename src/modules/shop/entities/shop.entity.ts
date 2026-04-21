import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, CreateDateColumn, OneToOne
} from 'typeorm';
import { ShopWallet } from './shop-wallet.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('shops')
export class Shop {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @Column({ length: 150 })
    name: string;

    @Column({ length: 150, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    logo_url: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'tinyint', default: 0 })
    status: number;
    // 0 pending, 1 active, 2 rejected, 3 locked

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    response_rate: number;

    @Column({ type: 'int', default: 0 })
    followers_count: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    product_quality_score: number;

    @CreateDateColumn()
    created_at: Date;

    @OneToOne(() => ShopWallet, wallet => wallet.shop)
    wallet: ShopWallet;
}
