import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ReturnRequest } from './return-request.entity';

@Entity('refunds')
export class Refund {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ReturnRequest)
    @JoinColumn({ name: 'return_request_id' })
    returnRequest: ReturnRequest;

    @Column({ type: 'decimal', precision: 14, scale: 2 })
    amount: number;

    @Column({ type: 'timestamp' })
    refunded_at: Date;
}
