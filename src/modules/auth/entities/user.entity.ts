import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Role } from './role.entity';
import { UserAddress } from './user_address.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150, unique: true })
    email: string;

    @Column({ type: 'text' })
    password_hash: string;

    @Column({ length: 150, nullable: true })
    full_name: string;

    @Column({ length: 20, nullable: true })
    phone: string;

    @Column({ default: false })
    is_phone_verified: boolean;

    @Column({ type: 'text', nullable: true })
    avatar_url: string;

    @Column({ type: 'smallint', default: 1 })
    status: number;

    @Column({ nullable: true })
    lock_reason: string;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @OneToMany(() => UserAddress, address => address.user)
    addresses: UserAddress[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn({ nullable: true })
    updated_at: Date;
}
