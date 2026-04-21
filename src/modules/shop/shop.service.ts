import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Shop } from './entities/shop.entity';
import { ShopWallet } from './entities/shop-wallet.entity';
import { ShopVerification } from './entities/shop-verification.entity';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { User } from '../auth/entities/user.entity';
import { Withdrawal } from '../order/entities/withdrawal.entity';
import { WalletTransaction } from '../order/entities/wallet_transaction.entity';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(ShopWallet)
    private readonly walletRepository: Repository<ShopWallet>,
    @InjectRepository(ShopVerification)
    private readonly verificationRepository: Repository<ShopVerification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    private dataSource: DataSource,
  ) { }

  async create(userId: string, createShopDto: CreateShopDto) {
    // 1. Check if user already owns a shop
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingShop = await this.shopRepository.findOne({
      where: { owner: { id: userId } }
    });
    if (existingShop) {
      throw new ConflictException('User already owns a shop');
    }

    // 2. Check if slug is unique
    const slugExists = await this.shopRepository.findOne({
      where: { slug: createShopDto.slug }
    });
    if (slugExists) {
      throw new ConflictException('Shop slug is already in use');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Create Shop
      const shop = queryRunner.manager.create(Shop, {
        ...createShopDto,
        owner: user,
        status: 0, // Pending verification
      });
      const savedShop = await queryRunner.manager.save(shop);

      // 4. Create Wallet for the shop
      const wallet = queryRunner.manager.create(ShopWallet, {
        shop_id: savedShop.id,
        balance: 0,
      });
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();
      return this.findOne(savedShop.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return this.shopRepository.find({ relations: ['owner'] });
  }

  async findOne(id: string) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner', 'wallet']
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return shop;
  }

  async findByUserId(userId: string) {
    const shop = await this.shopRepository.findOne({
      where: { owner: { id: userId } },
      relations: ['wallet']
    });
    if (!shop) {
      throw new NotFoundException('Shop not found for this user');
    }
    return shop;
  }

  async update(userId: string, updateShopDto: UpdateShopDto) {
    const shop = await this.findByUserId(userId);

    if (updateShopDto.slug && updateShopDto.slug !== shop.slug) {
      const existing = await this.shopRepository.findOne({ where: { slug: updateShopDto.slug } });
      if (existing) {
        throw new ConflictException('Slug is already in use');
      }
    }

    Object.assign(shop, updateShopDto);
    return this.shopRepository.save(shop);
  }

  // Admin action
  async updateStatus(id: string, adminId: string, status: number, reason?: string) {
    const shop = await this.findOne(id);
    const admin = await this.userRepository.findOne({ where: { id: adminId } });

    shop.status = status;
    await this.shopRepository.save(shop);

    // Log the verification action
    if (admin) {
      const verification = this.verificationRepository.create({
        shop,
        admin,
        status,
        reason,
      });
      await this.verificationRepository.save(verification);
    }

    return shop;
  }

  async getWallet(userId: string) {
    const shop = await this.findByUserId(userId);
    return shop.wallet;
  }

  async getWithdrawals(userId: string) {
    const shop = await this.findByUserId(userId);
    return this.withdrawalRepository.find({
      where: { shop_id: shop.id },
      order: { created_at: 'DESC' },
    });
  }

  async requestWithdrawal(userId: string, amountInput: number) {
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than 0');
    }

    const shop = await this.findByUserId(userId);
    const wallet = await this.walletRepository.findOne({ where: { shop_id: shop.id } });
    if (!wallet) {
      throw new NotFoundException('Shop wallet not found');
    }

    const currentBalance = Number(wallet.balance || 0);
    if (currentBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      wallet.balance = Number((currentBalance - amount).toFixed(2));
      await queryRunner.manager.save(wallet);

      const withdrawal = queryRunner.manager.create(Withdrawal, {
        shop_id: shop.id,
        amount,
        status: 0,
      });
      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      const transaction = queryRunner.manager.create(WalletTransaction, {
        shop_id: shop.id,
        type: 'OUT',
        amount,
        reference_id: `WITHDRAWAL:${savedWithdrawal.id}`,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return {
        message: 'Withdrawal request created',
        withdrawal: savedWithdrawal,
        wallet: {
          shop_id: wallet.shop_id,
          balance: Number(wallet.balance),
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getShopMetrics(shopId: string) {
    const shop = await this.findOne(shopId);

    return {
      id: shop.id,
      name: shop.name,
      response_rate: Number(shop.response_rate || 0),
      followers_count: Number(shop.followers_count || 0),
      product_quality_score: Number(shop.product_quality_score || 0),
      created_at: shop.created_at,
    };
  }

  /**
   * Update shop metrics
   * This would typically be called by cron jobs or event handlers
   */
  async updateShopMetrics(shopId: string, metrics: {
    response_rate?: number;
    followers_count?: number;
    product_quality_score?: number;
  }) {
    const shop = await this.findOne(shopId);

    if (metrics.response_rate !== undefined) {
      shop.response_rate = Math.min(100, Math.max(0, metrics.response_rate));
    }
    if (metrics.followers_count !== undefined) {
      shop.followers_count = Math.max(0, metrics.followers_count);
    }
    if (metrics.product_quality_score !== undefined) {
      shop.product_quality_score = Math.min(100, Math.max(0, metrics.product_quality_score));
    }

    return this.shopRepository.save(shop);
  }
}
