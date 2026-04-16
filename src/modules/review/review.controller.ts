import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser('id') userId: string, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.create(userId, createReviewDto);
  }

  @Get('product/:productId')
  findAllByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviewService.findAllByProduct(productId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReviewDto: UpdateReviewDto
  ) {
    return this.reviewService.update(userId, id, updateReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.remove(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  vote(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('value') value: number
  ) {
    return this.reviewService.vote(userId, id, value);
  }

  @Get(':id/votes')
  getVotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.getVoteStats(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/my-vote')
  getMyVote(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviewService.getMyVote(userId, id);
  }
}
