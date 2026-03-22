import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('violations')
export class Violation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    user_id: string;

    @Column()
    type: string;

    @Column()
    description: string;

    @Column()
    penalty: string;

    @CreateDateColumn()
    created_at: Date;
}