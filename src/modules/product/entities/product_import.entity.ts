import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('product_imports')
export class ProductImport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shop_id: string;

    @Column()
    file_url: string;

    @Column({ type: 'tinyint' })
    status: number;

    @Column({ type: 'text', nullable: true })
    error_log: string;

    @CreateDateColumn()
    created_at: Date;
}