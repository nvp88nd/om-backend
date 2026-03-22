import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity('banners')
export class Banner {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    image_url: string;

    @Column({ nullable: true })
    link: string;

    @Column()
    position: string;

    @Column({ type: 'tinyint' })
    status: number;
}