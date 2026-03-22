import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionProduct } from './entities/promotion_product.entity';
import { Product } from '../product/entities/product.entity';
import { CreatePromotionDto, UpdatePromotionDto, PromotionType } from './dto/promotion.dto';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(PromotionProduct)
    private readonly promotionProductRepository: Repository<PromotionProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async create(createPromotionDto: CreatePromotionDto) {
    const { product_ids, ...promotionData } = createPromotionDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const promotion = queryRunner.manager.create(Promotion, {
        ...promotionData,
        start_at: new Date(promotionData.start_at),
        end_at: new Date(promotionData.end_at),
      });
      const savedPromotion = await queryRunner.manager.save(promotion);

      if (promotionData.type === PromotionType.PRODUCT && product_ids && product_ids.length > 0) {
        const promotionProducts = product_ids.map(productId => 
          queryRunner.manager.create(PromotionProduct, {
            promotion_id: savedPromotion.id,
            product_id: productId,
          })
        );
        await queryRunner.manager.save(promotionProducts);
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedPromotion.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return this.promotionRepository.find();
  }

  async findActive() {
    const now = new Date();
    return this.promotionRepository.find({
      where: {
        start_at: LessThanOrEqual(now),
        end_at: MoreThanOrEqual(now),
      },
    });
  }

  async findOne(id: string) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    // If product type, fetch associated products
    if (promotion.type === PromotionType.PRODUCT) {
      const links = await this.promotionProductRepository.find({ where: { promotion_id: id } });
      const productIds = links.map(l => l.product_id);
      if (productIds.length > 0) {
        const products = await this.productRepository.find({ where: { id: In(productIds) } });
        return { ...promotion, products };
      }
    }

    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto) {
    const promotion = await this.findOne(id);
    
    if (updatePromotionDto.start_at) (promotion as any).start_at = new Date(updatePromotionDto.start_at);
    if (updatePromotionDto.end_at) (promotion as any).end_at = new Date(updatePromotionDto.end_at);
    
    Object.assign(promotion, updatePromotionDto);
    return this.promotionRepository.save(promotion as any);
  }

  async remove(id: string) {
    const promotion = await this.findOne(id);
    await this.promotionRepository.remove(promotion as any);
    return { message: 'Promotion deleted successfully' };
  }

  async getPromotionsForProduct(productId: string) {
    const now = new Date();
    
    // 1. Get system-wide promotions
    const systemPromotions = await this.promotionRepository.find({
      where: {
        type: PromotionType.SYSTEM,
        start_at: LessThanOrEqual(now),
        end_at: MoreThanOrEqual(now),
      },
    });

    // 2. Get specific product promotions
    const links = await this.promotionProductRepository.find({ where: { product_id: productId } });
    const promoIds = links.map(l => l.promotion_id);
    
    let productPromotions: Promotion[] = [];
    if (promoIds.length > 0) {
      productPromotions = await this.promotionRepository.find({
        where: {
          id: In(promoIds),
          start_at: LessThanOrEqual(now),
          end_at: MoreThanOrEqual(now),
        },
      });
    }

    return [...systemPromotions, ...productPromotions];
  }
}
