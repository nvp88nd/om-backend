import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, LessThanOrEqual, MoreThanOrEqual, Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Shop } from '../shop/entities/shop.entity';
import {
  CreatePromotionDto,
  PromotionFilterDto,
  PromotionTimeStatus,
  PromotionType,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { Promotion } from './entities/promotion.entity';
import { PromotionProduct } from './entities/promotion_product.entity';
import { UserVoucher } from './entities/user_voucher.entity';

type PromotionActor = {
  role: 'ADMIN' | 'SHOP_OWNER';
  userId: string;
};

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(PromotionProduct)
    private readonly promotionProductRepository: Repository<PromotionProduct>,
    @InjectRepository(UserVoucher)
    private readonly userVoucherRepository: Repository<UserVoucher>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    private readonly dataSource: DataSource,
  ) { }

  private normalizeCode(code?: string | null) {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizePromotion(promotion: Promotion, productIds?: string[]) {
    return {
      ...promotion,
      discount_type: Number(promotion.discount_type || 1),
      discount_value: Number(promotion.discount_value || 0),
      min_order_value:
        promotion.min_order_value !== null && promotion.min_order_value !== undefined
          ? Number(promotion.min_order_value)
          : null,
      max_discount_value:
        promotion.max_discount_value !== null && promotion.max_discount_value !== undefined
          ? Number(promotion.max_discount_value)
          : null,
      usage_limit:
        promotion.usage_limit !== null && promotion.usage_limit !== undefined
          ? Number(promotion.usage_limit)
          : null,
      per_user_limit:
        promotion.per_user_limit !== null && promotion.per_user_limit !== undefined
          ? Number(promotion.per_user_limit)
          : null,
      used_count: Number(promotion.used_count || 0),
      is_active: Number(promotion.is_active || 0),
      product_ids: productIds ?? undefined,
    };
  }

  private ensureDateRange(startAtInput: string | Date, endAtInput: string | Date) {
    const startAt = startAtInput instanceof Date ? startAtInput : new Date(startAtInput);
    const endAt = endAtInput instanceof Date ? endAtInput : new Date(endAtInput);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid promotion date range');
    }

    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('end_at must be greater than start_at');
    }

    return { startAt, endAt };
  }

  private async getShopByOwner(userId: string) {
    const shop = await this.shopRepository.findOne({
      where: { owner: { id: userId } },
    });

    if (!shop) {
      throw new BadRequestException('User does not own a shop');
    }

    return shop;
  }

  private async getPromotionProductIds(promotionId: string) {
    const links = await this.promotionProductRepository.find({
      where: { promotion_id: promotionId },
    });

    return links.map((item) => item.product_id);
  }

  private async validateProductOwnership(productIds: string[], shopId: string) {
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one product is required for PRODUCT promotion');
    }

    const products = await this.productRepository.find({
      where: { id: In(uniqueIds) },
      relations: ['shop'],
    });

    if (products.length !== uniqueIds.length) {
      throw new BadRequestException('Some products do not exist');
    }

    const invalidProduct = products.find((product) => product.shop?.id !== shopId);
    if (invalidProduct) {
      throw new BadRequestException('Selected product does not belong to target shop');
    }

    return uniqueIds;
  }

  private async ensureCodeIsUnique(code: string | null, excludePromotionId?: string) {
    if (!code) return;

    const existing = await this.promotionRepository.findOne({ where: { code } });
    if (existing && existing.id !== excludePromotionId) {
      throw new ConflictException('Promotion code already exists');
    }
  }

  private applyFilter(query: SelectQueryBuilder<Promotion>, filter?: PromotionFilterDto) {
    if (!filter) return;

    if (filter.search) {
      query.andWhere('(promotion.name LIKE :search OR promotion.code LIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    if (filter.type !== undefined) {
      query.andWhere('promotion.type = :type', { type: filter.type });
    }

    if (filter.shop_id) {
      query.andWhere('promotion.shop_id = :shopId', { shopId: filter.shop_id });
    }

    if (filter.is_active !== undefined) {
      query.andWhere('promotion.is_active = :isActive', { isActive: filter.is_active ? 1 : 0 });
    }

    if (filter.status) {
      const now = new Date();
      switch (filter.status) {
        case PromotionTimeStatus.ACTIVE:
          query
            .andWhere('promotion.is_active = 1')
            .andWhere('promotion.start_at <= :activeNow', { activeNow: now })
            .andWhere('promotion.end_at >= :activeNow', { activeNow: now });
          break;
        case PromotionTimeStatus.UPCOMING:
          query
            .andWhere('promotion.is_active = 1')
            .andWhere('promotion.start_at > :upcomingNow', { upcomingNow: now });
          break;
        case PromotionTimeStatus.EXPIRED:
          query.andWhere('promotion.end_at < :expiredNow', { expiredNow: now });
          break;
        case PromotionTimeStatus.INACTIVE:
          query.andWhere('promotion.is_active = 0');
          break;
      }
    }
  }

  private async assertSellerCanManage(actor: PromotionActor, promotion: Promotion) {
    const shop = await this.getShopByOwner(actor.userId);

    if (!promotion.shop_id || promotion.shop_id !== shop.id) {
      throw new ForbiddenException('You are not allowed to manage this promotion');
    }

    if (promotion.type === PromotionType.SYSTEM) {
      throw new ForbiddenException('You cannot manage system promotions');
    }

    return shop;
  }

  async create(createPromotionDto: CreatePromotionDto, actor?: PromotionActor) {
    const code = this.normalizeCode(createPromotionDto.code);
    await this.ensureCodeIsUnique(code);

    const { startAt, endAt } = this.ensureDateRange(
      createPromotionDto.start_at,
      createPromotionDto.end_at,
    );

    let targetShopId: string | null = createPromotionDto.shop_id ?? null;

    if (actor?.role === 'SHOP_OWNER') {
      const shop = await this.getShopByOwner(actor.userId);
      targetShopId = shop.id;

      if (createPromotionDto.type === PromotionType.SYSTEM) {
        throw new BadRequestException('Seller cannot create system promotions');
      }
    }

    if (createPromotionDto.type === PromotionType.SYSTEM) {
      targetShopId = null;
    }

    if (
      (createPromotionDto.type === PromotionType.SHOP ||
        createPromotionDto.type === PromotionType.PRODUCT) &&
      !targetShopId
    ) {
      throw new BadRequestException('shop_id is required for SHOP/PRODUCT promotions');
    }

    if (targetShopId) {
      const targetShop = await this.shopRepository.findOne({ where: { id: targetShopId } });
      if (!targetShop) {
        throw new BadRequestException('Target shop not found');
      }
    }

    let productIds: string[] = [];
    if (createPromotionDto.type === PromotionType.PRODUCT) {
      productIds = await this.validateProductOwnership(createPromotionDto.product_ids ?? [], targetShopId!);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const promotion = queryRunner.manager.create(Promotion, {
        name: createPromotionDto.name,
        code,
        type: createPromotionDto.type,
        discount_type: createPromotionDto.discount_type,
        discount_value: createPromotionDto.discount_value,
        min_order_value: createPromotionDto.min_order_value ?? null,
        max_discount_value: createPromotionDto.max_discount_value ?? null,
        usage_limit: createPromotionDto.usage_limit ?? null,
        per_user_limit: createPromotionDto.per_user_limit ?? null,
        used_count: 0,
        is_active: createPromotionDto.is_active === false ? 0 : 1,
        shop_id: targetShopId,
        start_at: startAt,
        end_at: endAt,
      });

      const savedPromotion = await queryRunner.manager.save(Promotion, promotion);

      if (createPromotionDto.type === PromotionType.PRODUCT) {
        const promotionProducts = productIds.map((productId) =>
          queryRunner.manager.create(PromotionProduct, {
            promotion_id: savedPromotion.id,
            product_id: productId,
          }),
        );

        await queryRunner.manager.save(PromotionProduct, promotionProducts);
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedPromotion.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filter?: PromotionFilterDto) {
    const query = this.promotionRepository.createQueryBuilder('promotion');
    this.applyFilter(query, filter);

    query.orderBy('promotion.start_at', 'DESC');

    const items = await query.getMany();
    return items.map((item) => this.normalizePromotion(item));
  }

  async findForAdmin(filter?: PromotionFilterDto) {
    const page = Math.max(1, Number(filter?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filter?.limit || 10)));

    const query = this.promotionRepository.createQueryBuilder('promotion');
    this.applyFilter(query, filter);

    query.orderBy('promotion.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items: items.map((item) => this.normalizePromotion(item)),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findForSeller(userId: string, filter?: PromotionFilterDto) {
    const shop = await this.getShopByOwner(userId);
    const page = Math.max(1, Number(filter?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filter?.limit || 10)));

    const query = this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.shop_id = :shopId', { shopId: shop.id });

    this.applyFilter(query, { ...filter, shop_id: shop.id });

    query.orderBy('promotion.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items: items.map((item) => this.normalizePromotion(item)),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findActive(filter?: PromotionFilterDto) {
    const now = new Date();

    const query = this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.is_active = 1')
      .andWhere('promotion.start_at <= :now', { now })
      .andWhere('promotion.end_at >= :now', { now });

    this.applyFilter(query, filter);

    query.orderBy('promotion.start_at', 'ASC');

    const items = await query.getMany();
    return items.map((item) => this.normalizePromotion(item));
  }

  async findOne(id: string) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const productIds =
      promotion.type === PromotionType.PRODUCT ? await this.getPromotionProductIds(id) : [];

    return this.normalizePromotion(promotion, productIds);
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto, actor?: PromotionActor) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    let sellerShopId: string | null = null;
    if (actor?.role === 'SHOP_OWNER') {
      const shop = await this.assertSellerCanManage(actor, promotion);
      sellerShopId = shop.id;
    }

    const nextType = updatePromotionDto.type ?? promotion.type;

    let nextShopId: string | null = promotion.shop_id ?? null;
    if (nextType === PromotionType.SYSTEM) {
      nextShopId = null;
    } else if (actor?.role === 'SHOP_OWNER') {
      nextShopId = sellerShopId;
    } else if (updatePromotionDto.shop_id !== undefined) {
      nextShopId = updatePromotionDto.shop_id;
    }

    if ((nextType === PromotionType.SHOP || nextType === PromotionType.PRODUCT) && !nextShopId) {
      throw new BadRequestException('shop_id is required for SHOP/PRODUCT promotions');
    }

    if (nextShopId) {
      const targetShop = await this.shopRepository.findOne({ where: { id: nextShopId } });
      if (!targetShop) {
        throw new BadRequestException('Target shop not found');
      }
    }

    const startAtInput = updatePromotionDto.start_at ?? promotion.start_at;
    const endAtInput = updatePromotionDto.end_at ?? promotion.end_at;
    const { startAt, endAt } = this.ensureDateRange(startAtInput, endAtInput);

    const normalizedCode =
      updatePromotionDto.code !== undefined
        ? this.normalizeCode(updatePromotionDto.code)
        : this.normalizeCode(promotion.code);
    await this.ensureCodeIsUnique(normalizedCode, id);

    let productIds: string[] = [];
    if (nextType === PromotionType.PRODUCT) {
      if (updatePromotionDto.product_ids !== undefined) {
        productIds = await this.validateProductOwnership(updatePromotionDto.product_ids, nextShopId!);
      } else {
        const existingProductIds = await this.getPromotionProductIds(id);
        productIds = await this.validateProductOwnership(existingProductIds, nextShopId!);
      }
    }

    promotion.name = updatePromotionDto.name ?? promotion.name;
    promotion.code = normalizedCode;
    promotion.type = nextType;
    promotion.discount_type = updatePromotionDto.discount_type ?? promotion.discount_type;
    promotion.discount_value = updatePromotionDto.discount_value ?? promotion.discount_value;
    promotion.min_order_value =
      updatePromotionDto.min_order_value !== undefined
        ? updatePromotionDto.min_order_value
        : promotion.min_order_value;
    promotion.max_discount_value =
      updatePromotionDto.max_discount_value !== undefined
        ? updatePromotionDto.max_discount_value
        : promotion.max_discount_value;
    promotion.usage_limit =
      updatePromotionDto.usage_limit !== undefined
        ? updatePromotionDto.usage_limit
        : promotion.usage_limit;
    promotion.per_user_limit =
      updatePromotionDto.per_user_limit !== undefined
        ? updatePromotionDto.per_user_limit
        : promotion.per_user_limit;
    promotion.is_active =
      updatePromotionDto.is_active !== undefined
        ? updatePromotionDto.is_active
          ? 1
          : 0
        : promotion.is_active;
    promotion.shop_id = nextShopId;
    promotion.start_at = startAt;
    promotion.end_at = endAt;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(Promotion, promotion);

      await queryRunner.manager.delete(PromotionProduct, { promotion_id: id });
      if (nextType === PromotionType.PRODUCT) {
        const promotionProducts = productIds.map((productId) =>
          queryRunner.manager.create(PromotionProduct, {
            promotion_id: id,
            product_id: productId,
          }),
        );

        if (promotionProducts.length > 0) {
          await queryRunner.manager.save(PromotionProduct, promotionProducts);
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, actor?: PromotionActor) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (actor?.role === 'SHOP_OWNER') {
      await this.assertSellerCanManage(actor, promotion);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(PromotionProduct, { promotion_id: id });
      await queryRunner.manager.delete(Promotion, { id });

      await queryRunner.commitTransaction();
      return { message: 'Promotion deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPromotionsForProduct(productId: string) {
    const now = new Date();
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['shop'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const activeRange = {
      start_at: LessThanOrEqual(now),
      end_at: MoreThanOrEqual(now),
      is_active: 1,
    } as const;

    const [systemPromotions, shopPromotions] = await Promise.all([
      this.promotionRepository.find({
        where: {
          ...activeRange,
          type: PromotionType.SYSTEM,
        },
      }),
      product.shop?.id
        ? this.promotionRepository.find({
          where: {
            ...activeRange,
            type: PromotionType.SHOP,
            shop_id: product.shop.id,
          },
        })
        : Promise.resolve([]),
    ]);

    const links = await this.promotionProductRepository.find({ where: { product_id: productId } });
    const promoIds = links.map((item) => item.promotion_id);

    let productPromotions: Promotion[] = [];
    if (promoIds.length > 0) {
      productPromotions = await this.promotionRepository.find({
        where: {
          id: In(promoIds),
          ...activeRange,
          type: PromotionType.PRODUCT,
        },
      });
    }

    const merged = [...systemPromotions, ...shopPromotions, ...productPromotions];
    const uniqueById = new Map<string, Promotion>();
    merged.forEach((promotion) => {
      uniqueById.set(promotion.id, promotion);
    });

    return Array.from(uniqueById.values()).map((item) => this.normalizePromotion(item));
  }

  async collectVoucher(userId: string, promotionId: string) {
    const promotion = await this.promotionRepository.findOne({ where: { id: promotionId } });
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    const now = new Date();
    if (!promotion.is_active || promotion.start_at > now || promotion.end_at < now) {
      throw new BadRequestException('Promotion is not active or has expired');
    }

    if (promotion.usage_limit && promotion.used_count >= promotion.usage_limit) {
      throw new BadRequestException('Promotion usage limit reached');
    }

    let userVoucher = await this.userVoucherRepository.findOne({
      where: { user_id: userId, promotion_id: promotionId },
    });

    if (userVoucher) {
      if (userVoucher.saved_at) {
        throw new ConflictException('You have already saved this voucher');
      }
      userVoucher.saved_at = new Date();
    } else {
      userVoucher = this.userVoucherRepository.create({
        user_id: userId,
        promotion_id: promotionId,
        saved_at: new Date(),
        used_count: 0,
      });
    }

    await this.userVoucherRepository.save(userVoucher);
    return { message: 'Voucher saved to your wallet' };
  }

  async getMyVouchers(userId: string) {
    const userVouchers = await this.userVoucherRepository.find({
      where: { user_id: userId },
      relations: ['promotion'],
      order: { saved_at: 'DESC' },
    });

    return userVouchers.map((uv) => ({
      ...this.normalizePromotion(uv.promotion),
      saved_at: uv.saved_at,
      user_used_count: uv.used_count,
    }));
  }

  async validateVoucher(code: string, userId: string, subtotal: number, shopId?: string, productIds?: string[]) {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) {
      throw new BadRequestException('Promotion code is required');
    }

    const safeSubtotal = Number(subtotal);
    if (!Number.isFinite(safeSubtotal) || safeSubtotal < 0) {
      throw new BadRequestException('Invalid subtotal value');
    }

    const promotion = await this.promotionRepository.findOne({ where: { code: normalizedCode } });
    if (!promotion) {
      throw new NotFoundException('Invalid promotion code');
    }

    const now = new Date();
    if (!promotion.is_active || promotion.start_at > now || promotion.end_at < now) {
      throw new BadRequestException('Promotion is not currently active');
    }

    if (promotion.usage_limit && promotion.used_count >= promotion.usage_limit) {
      throw new BadRequestException('Promotion usage limit reached');
    }

    if (promotion.type === PromotionType.SHOP && promotion.shop_id !== shopId) {
      throw new BadRequestException('This voucher is not applicable to this shop');
    }

    if (promotion.type === PromotionType.PRODUCT) {
      const promoProductIds = await this.getPromotionProductIds(promotion.id);
      const hasMatchingProduct = productIds?.some((pid) => promoProductIds.includes(pid));
      if (!hasMatchingProduct) {
        throw new BadRequestException('This voucher is not applicable to any products in your cart');
      }
    }

    if (promotion.min_order_value && safeSubtotal < Number(promotion.min_order_value)) {
      throw new BadRequestException(`Minimum order value of ${promotion.min_order_value} required`);
    }

    const userVoucher = await this.userVoucherRepository.findOne({
      where: { user_id: userId, promotion_id: promotion.id },
    });

    const userUsedCount = userVoucher ? userVoucher.used_count : 0;
    if (promotion.per_user_limit && userUsedCount >= promotion.per_user_limit) {
      throw new BadRequestException('You have reached the usage limit for this promotion');
    }

    // Calculate discount
    let discountAmount = 0;
    if (Number(promotion.discount_type) === 1) {
      // PERCENTAGE
      discountAmount = (safeSubtotal * Number(promotion.discount_value)) / 100;
      if (promotion.max_discount_value && discountAmount > Number(promotion.max_discount_value)) {
        discountAmount = Number(promotion.max_discount_value);
      }
    } else {
      // FIXED_AMOUNT
      discountAmount = Number(promotion.discount_value);
    }

    // Discount cannot exceed subtotal
    discountAmount = Math.min(discountAmount, safeSubtotal);

    return {
      promotion: this.normalizePromotion(promotion),
      discount_amount: discountAmount,
    };
  }

  async recordUsage(manager: EntityManager, userId: string, promotionId: string) {
    const promotion = await manager.findOne(Promotion, { where: { id: promotionId } });
    if (!promotion) return;

    promotion.used_count += 1;
    await manager.save(promotion);

    let userVoucher = await manager.findOne(UserVoucher, {
      where: { user_id: userId, promotion_id: promotionId },
    });

    if (!userVoucher) {
      userVoucher = manager.create(UserVoucher, {
        user_id: userId,
        promotion_id: promotionId,
        used_count: 1,
      });
    } else {
      userVoucher.used_count += 1;
    }

    await manager.save(userVoucher);
  }
}

