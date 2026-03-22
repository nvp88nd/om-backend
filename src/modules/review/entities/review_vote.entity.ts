import { Entity, Column } from "typeorm";

@Entity('review_votes')
export class ReviewVote {
    @Column()
    review_id: string;

    @Column()
    user_id: string;

    @Column({ type: 'tinyint' })
    value: number;
}