import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../auth/entities/user.entity";

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'tinyint' })
    type: number;
    // 1: order
    // 2: promotion
    // 3: system

    @Column({ nullable: true })
    reference_id: string; // order_id, promotion_id...

    @Column({ type: 'tinyint', default: 0 })
    is_read: number;

    @CreateDateColumn()
    created_at: Date;
}