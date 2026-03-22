import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('complaints')
export class Complaint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    user_id: string;

    @Column()
    target_type: string;

    @Column()
    target_id: string;

    @Column()
    reason: string;

    @Column({ type: 'tinyint' })
    status: number;

    @CreateDateColumn()
    created_at: Date;
}