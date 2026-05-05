import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '../auth/entities/user.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { WalletTransaction } from '../order/entities/wallet_transaction.entity';
import { UserWallet } from './entities/user-wallet.entity';
import { UserWalletService } from './user-wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAddress, WalletTransaction, UserWallet])],
  controllers: [UserController],
  providers: [UserService, UserWalletService],
  exports: [UserService, UserWalletService],
})
export class UserModule { }
