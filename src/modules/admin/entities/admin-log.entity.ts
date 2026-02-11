import { User } from '../../auth/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';

@Entity('admin_logs')
export class AdminLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'admin_id' })
    admin: User;

    @Column({ length: 255 })
    action: string;

    @Column({ length: 50 })
    target_type: string;

    @Column({ type: 'char', length: 36, nullable: true })
    target_id: string;

    @CreateDateColumn()
    created_at: Date;
}
