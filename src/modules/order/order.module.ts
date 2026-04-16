import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderShop } from './entities/order-shop.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { ReturnRequest } from './entities/return-request.entity';
import { Refund } from './entities/refund.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { Shop } from '../shop/entities/shop.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { PromotionModule } from '../promotion/promotion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderShop,
      OrderItem,
      Payment,
      ReturnRequest,
      Refund,
      ProductVariant,
      UserAddress,
      Shop,
      Cart,
      CartItem,
    ]),
    PromotionModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule { }
