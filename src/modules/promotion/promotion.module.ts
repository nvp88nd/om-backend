import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { Promotion } from './entities/promotion.entity';
import { PromotionProduct } from './entities/promotion_product.entity';
import { UserVoucher } from './entities/user_voucher.entity';
import { Product } from '../product/entities/product.entity';
import { Shop } from '../shop/entities/shop.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion, PromotionProduct, UserVoucher, Product, Shop]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
