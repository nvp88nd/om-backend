import { Entity, Column } from "typeorm";

@Entity('promotion_products')
export class PromotionProduct {
    @Column()
    promotion_id: string;

    @Column()
    product_id: string;
}