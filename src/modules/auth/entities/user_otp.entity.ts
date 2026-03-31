import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('user_otps')
export class UserOtp {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    user_id: string;

    @Column()
    code: string;

    @Column()
    type: 'VERIFY_PHONE' | 'VERIFY_EMAIL' | 'RESET_PASSWORD';

    @Column()
    expires_at: Date;

    @Column({ default: false })
    is_used: boolean;
}