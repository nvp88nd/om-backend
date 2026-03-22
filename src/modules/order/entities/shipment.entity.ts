import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity('shipments')
export class Shipment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    order_id: string;

    @Column()
    tracking_code: string;

    @Column()
    carrier: string;

    @Column({ type: 'tinyint' })
    status: number;

    @Column({ nullable: true })
    shipped_at: Date;

    @Column({ nullable: true })
    delivered_at: Date;
}