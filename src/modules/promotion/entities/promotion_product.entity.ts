import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity('promotion_products')
export class PromotionProduct {
    @PrimaryColumn({ type: 'char', length: 36 })
    promotion_id: string;

    @PrimaryColumn({ type: 'char', length: 36 })
    product_id: string;
}