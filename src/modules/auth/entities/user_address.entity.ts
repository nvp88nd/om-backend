import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('user_addresses')
export class UserAddress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    user_id: string;

    @ManyToOne(() => User, user => user.addresses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ length: 150 })
    receiver_name: string;

    @Column({ length: 20 })
    receiver_phone: string;

    @Column({ length: 100 })
    province: string;

    @Column({ length: 100 })
    district: string;

    @Column({ length: 100 })
    ward: string;

    @Column({ type: 'text' })
    detail_address: string;

    @Column({ type: 'tinyint', default: 0 })
    is_default: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}