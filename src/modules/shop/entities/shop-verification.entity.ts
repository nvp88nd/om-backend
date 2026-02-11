import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Shop } from './shop.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('shop_verifications')
export class ShopVerification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Shop)
    @JoinColumn({ name: 'shop_id' })
    shop: Shop;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'admin_id' })
    admin: User;

    @Column({ type: 'smallint' })
    status: number;

    @Column({ type: 'text', nullable: true })
    reason: string;

    @CreateDateColumn()
    created_at: Date;
}
