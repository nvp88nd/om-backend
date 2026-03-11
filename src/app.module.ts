import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [HealthModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
