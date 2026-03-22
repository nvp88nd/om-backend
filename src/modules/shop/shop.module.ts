import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { Shop } from './entities/shop.entity';
import { ShopWallet } from './entities/shop-wallet.entity';
import { ShopVerification } from './entities/shop-verification.entity';
import { ShopWarning } from './entities/shop_warning.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shop,
      ShopWallet,
      ShopVerification,
      ShopWarning,
      User,
    ]),
  ],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
