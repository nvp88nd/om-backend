import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderShop } from './entities/order-shop.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { Shop } from '../shop/entities/shop.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderShop,
      OrderItem,
      Payment,
      ProductVariant,
      UserAddress,
      Shop,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
