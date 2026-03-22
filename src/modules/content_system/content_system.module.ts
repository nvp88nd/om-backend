import { Module } from '@nestjs/common';
import { ContentSystemService } from './content_system.service';
import { ContentSystemController } from './content_system.controller';

@Module({
  controllers: [ContentSystemController],
  providers: [ContentSystemService],
})
export class ContentSystemModule {}
