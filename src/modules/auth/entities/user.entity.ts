import {
    Entity, PrimaryGeneratedColumn, Column,
    ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Role } from './role.entity';

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

    @Column({ type: 'text', nullable: true })
    avatar_url: string;

    @Column({ type: 'smallint', default: 1 })
    status: number;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn({ nullable: true })
    updated_at: Date;
}
