import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { ShopModule } from './modules/shop/shop.module';
import { OrderModule } from './modules/order/order.module';
import { CartModule } from './modules/cart/cart.module';
import { ReviewModule } from './modules/review/review.module';
import { PermissionModule } from './modules/permission/permission.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { ContentSystemModule } from './modules/content_system/content_system.module';
import { AdminModule } from './modules/admin/admin.module';
import { ComplaintViolationModule } from './modules/complaint_violation/complaint_violation.module';
// Future modules can be imported here

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        charset: 'utf8mb4',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
      }),
    }),
    AuthModule,
    UserModule,
    ProductModule,
    ShopModule,
    OrderModule,
    CartModule,
    ReviewModule,
    PermissionModule,
    ChatModule,
    NotificationModule,
    PromotionModule,
    ContentSystemModule,
    AdminModule,
    ComplaintViolationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
