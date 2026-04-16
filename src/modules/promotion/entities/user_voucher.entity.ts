import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Promotion } from './promotion.entity';

@Entity('user_vouchers')
export class UserVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  promotion_id: string;

  @Column({ type: 'int', default: 0 })
  used_count: number;

  @Column({ type: 'timestamp', nullable: true })
  saved_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Promotion)
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;
}
