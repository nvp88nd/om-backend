import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('notification_broadcasts')
export class NotificationBroadcast {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column('text')
    content: string;

    @Column({ type: 'tinyint' })
    type: number;

    @CreateDateColumn()
    created_at: Date;
}