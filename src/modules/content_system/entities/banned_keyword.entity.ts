import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity('banned_keywords')
export class BannedKeyword {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    keyword: string;
}