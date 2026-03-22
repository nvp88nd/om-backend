import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity('review_votes')
export class ReviewVote {
    @PrimaryColumn({ type: 'char', length: 36 })
    review_id: string;

    @PrimaryColumn({ type: 'char', length: 36 })
    user_id: string;

    @Column({ type: 'tinyint' })
    value: number;
}