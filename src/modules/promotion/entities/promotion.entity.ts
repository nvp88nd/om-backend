import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 60, nullable: true, unique: true })
  code?: string | null;

  @Column({ type: 'tinyint' })
  type: number;

  @Column({ type: 'tinyint', default: 1 })
  discount_type: number;

  @Column('decimal', { precision: 12, scale: 2 })
  discount_value: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  min_order_value?: number | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  max_discount_value?: number | null;

  @Column({ type: 'int', nullable: true })
  usage_limit?: number | null;

  @Column({ type: 'int', nullable: true })
  per_user_limit?: number | null;

  @Column({ type: 'int', default: 0 })
  used_count: number;

  @Column({ type: 'tinyint', default: 1 })
  is_active: number;

  @Column({ type: 'char', length: 36, nullable: true })
  shop_id?: string | null;

  @Column()
  start_at: Date;

  @Column()
  end_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
