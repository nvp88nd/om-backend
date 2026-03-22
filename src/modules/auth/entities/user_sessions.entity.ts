import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('user_sessions')
export class UserSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    user_id: string;

    @Column()
    refresh_token: string;

    @Column()
    expires_at: Date;
}