import { Entity, Column, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Shop } from './shop.entity';

@Entity('shop_wallets')
export class ShopWallet {
    @PrimaryColumn({ type: 'char', length: 36 })
    shop_id: string;

    @OneToOne(() => Shop)
    @JoinColumn({ name: 'shop_id' })
    shop: Shop;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    balance: number;
}
