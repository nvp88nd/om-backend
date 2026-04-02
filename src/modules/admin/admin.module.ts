import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminLog } from './entities/admin-log.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Shop } from '../shop/entities/shop.entity';
import { Withdrawal } from '../order/entities/withdrawal.entity';
import { ShopWallet } from '../shop/entities/shop-wallet.entity';
import { WalletTransaction } from '../order/entities/wallet_transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminLog, User, Role, Shop, Withdrawal, ShopWallet, WalletTransaction]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
