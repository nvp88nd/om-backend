import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentSystemService } from './content_system.service';
import { ContentSystemController } from './content_system.controller';
import { Banner } from './entities/banner.entity';
import { BannedKeyword } from './entities/banned_keyword.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner, BannedKeyword]),
    AuthModule,
  ],
  controllers: [ContentSystemController],
  providers: [ContentSystemService],
  exports: [ContentSystemService],
})
export class ContentSystemModule {}
