import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewVote } from './entities/review_vote.entity';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { Product } from '../product/entities/product.entity';
import { Order } from '../order/entities/order.entity';
import { OrderStatus } from '../order/order.constants';
import { ContentSystemService } from '../content_system/content_system.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewVote)
    private readonly voteRepository: Repository<ReviewVote>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly contentSystemService: ContentSystemService,
  ) { }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { product_id, rating, comment } = createReviewDto;

    if (comment?.trim()) {
      const containsBanned = await this.contentSystemService.checkContent(comment);
      if (containsBanned) {
        throw new BadRequestException('Review contains banned content');
      }
    }

    // 1. Check if product exists
    const product = await this.productRepository.findOne({ where: { id: product_id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. Check if user has already reviewed this product
    const existingReview = await this.reviewRepository.findOne({
      where: { user: { id: userId }, product: { id: product_id } },
    });
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // 3. Optional: Check if user has purchased the product
    const order = await this.orderRepository.findOne({
      where: {
        user: { id: userId },
        status: OrderStatus.COMPLETED,
        orderShops: {
          items: {
            variant: {
              product: { id: product_id }
            }
          }
        }
      },
    });

    // For this prototype, we'll allow all reviews to make it easier to test, 
    // but in a real app, we'd uncomment the check below:
    /*
    if (!order) {
      throw new ForbiddenException('You can only review products you have purchased and received');
    }
    */

    const review = this.reviewRepository.create({
      user: { id: userId } as any,
      product: { id: product_id } as any,
      rating,
      comment,
    });

    return this.reviewRepository.save(review);
  }

  async findAllByProduct(productId: string) {
    return this.reviewRepository.find({
      where: { product: { id: productId } },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async update(userId: string, id: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.findOne(id);

    if (review.user.id !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    return this.reviewRepository.save(review);
  }

  async remove(userId: string, id: string) {
    const review = await this.findOne(id);

    if (review.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.remove(review);
    return { message: 'Review deleted successfully' };
  }

  // Voting logic (Helpful/Not helpful)
  async vote(userId: string, reviewId: string, value: number) {
    // value: 1 for helpful, -1 for not helpful, 0 to remove vote
    const review = await this.findOne(reviewId);

    if (value === 0) {
      await this.voteRepository.delete({ review_id: reviewId, user_id: userId });
      return { message: 'Vote removed' };
    }

    let vote = await this.voteRepository.findOne({
      where: { review_id: reviewId, user_id: userId },
    });

    if (vote) {
      vote.value = value;
    } else {
      vote = this.voteRepository.create({
        review_id: reviewId,
        user_id: userId,
        value,
      });
    }

    await this.voteRepository.save(vote);
    return vote;
  }

  async getVoteStats(reviewId: string) {
    const votes = await this.voteRepository.find({ where: { review_id: reviewId } });
    const helpful = votes.filter(v => v.value === 1).length;
    const notHelpful = votes.filter(v => v.value === -1).length;

    return { helpful, notHelpful };
  }

  async getMyVote(userId: string, reviewId: string) {
    const vote = await this.voteRepository.findOne({
      where: { review_id: reviewId, user_id: userId },
    });

    return { value: vote?.value ?? 0 };
  }
}
