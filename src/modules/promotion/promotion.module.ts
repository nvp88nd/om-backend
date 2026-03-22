import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { Promotion } from './entities/promotion.entity';
import { PromotionProduct } from './entities/promotion_product.entity';
import { Product } from '../product/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion, PromotionProduct, Product]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
