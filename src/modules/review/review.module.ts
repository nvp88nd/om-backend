import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review } from './entities/review.entity';
import { ReviewVote } from './entities/review_vote.entity';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/entities/order.entity';
import { ContentSystemModule } from '../content_system/content_system.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewVote, Product, Order]),
    ContentSystemModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule { }
