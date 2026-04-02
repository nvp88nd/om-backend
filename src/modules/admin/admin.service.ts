import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AdminLog } from './entities/admin-log.entity';
import { CreateAdminLogDto } from './dto/admin.dto';
import { User } from '../auth/entities/user.entity';
import { Shop } from '../shop/entities/shop.entity';
import { Withdrawal } from '../order/entities/withdrawal.entity';
import { ShopWallet } from '../shop/entities/shop-wallet.entity';
import { WalletTransaction } from '../order/entities/wallet_transaction.entity';
import { AdminUserFilterDto, UpdateUserStatusDto } from './dto/admin-user.dto';
import { AdminWithdrawalFilterDto } from './dto/admin-finance.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminLog)
    private readonly adminLogRepository: Repository<AdminLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(ShopWallet)
    private readonly shopWalletRepository: Repository<ShopWallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async createLog(adminId: string, dto: CreateAdminLogDto) {
    const log = this.adminLogRepository.create({
      ...dto,
      admin: { id: adminId } as any,
    });
    return this.adminLogRepository.save(log);
  }

  async findAllLogs() {
    return this.adminLogRepository.find({
      relations: ['admin'],
      order: { created_at: 'DESC' },
    });
  }

  async findLogsByAdmin(adminId: string) {
    return this.adminLogRepository.find({
      where: { admin: { id: adminId } },
      order: { created_at: 'DESC' },
    });
  }

  async findUsers(filter: AdminUserFilterDto) {
    const { page = 1, limit = 20, search, status, role } = filter;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search?.trim()) {
      query.andWhere(
        '(user.email LIKE :search OR user.full_name LIKE :search OR user.phone LIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    if (status !== undefined) {
      query.andWhere('user.status = :status', { status });
    }

    if (role?.trim()) {
      query.andWhere('role.code = :roleCode', { roleCode: role.trim().toUpperCase() });
    }

    const [users, total] = await query.getManyAndCount();

    const userIds = users.map((user) => user.id);
    const shops = userIds.length
      ? await this.shopRepository.find({
          where: { owner: { id: In(userIds) } },
          relations: ['owner'],
          order: { created_at: 'DESC' },
        })
      : [];

    const shopByOwnerId = new Map<string, Shop[]>();
    for (const shop of shops) {
      const ownerId = shop.owner?.id;
      if (!ownerId) continue;
      const existing = shopByOwnerId.get(ownerId) ?? [];
      existing.push(shop);
      shopByOwnerId.set(ownerId, existing);
    }

    const items = users.map((user) => {
      const { password_hash: _, ...userInfo } = user as any;
      return {
        ...userInfo,
        shops: (shopByOwnerId.get(user.id) ?? []).map((shop) => ({
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          status: shop.status,
          created_at: shop.created_at,
        })),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(adminId: string, userId: string, dto: UpdateUserStatusDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = dto.status;
    user.lock_reason = dto.status === 1 ? null : dto.lock_reason ?? 'Locked by admin';
    const saved = await this.userRepository.save(user);

    await this.createLog(adminId, {
      action: 'UPDATE_USER_STATUS',
      target_type: 'USER',
      target_id: saved.id,
    });

    const { password_hash: _, ...userInfo } = saved as any;
    return userInfo;
  }

  async findWithdrawals(filter: AdminWithdrawalFilterDto) {
    const { page = 1, limit = 20, status } = filter;

    const where = status !== undefined ? { status } : {};
    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const shopIds = [...new Set(withdrawals.map((item) => item.shop_id))];
    const [shops, wallets] = await Promise.all([
      shopIds.length
        ? this.shopRepository.find({
            where: { id: In(shopIds) },
            relations: ['owner'],
          })
        : Promise.resolve([]),
      shopIds.length
        ? this.shopWalletRepository.find({
            where: { shop_id: In(shopIds) },
          })
        : Promise.resolve([]),
    ]);

    const shopMap = new Map(shops.map((shop) => [shop.id, shop]));
    const walletMap = new Map(wallets.map((wallet) => [wallet.shop_id, wallet]));

    return {
      items: withdrawals.map((item) => {
        const shop = shopMap.get(item.shop_id);
        const wallet = walletMap.get(item.shop_id);
        return {
          ...item,
          amount: Number(item.amount),
          shop: shop
            ? {
                id: shop.id,
                name: shop.name,
                slug: shop.slug,
                status: shop.status,
                owner: shop.owner
                  ? {
                      id: shop.owner.id,
                      email: shop.owner.email,
                      full_name: shop.owner.full_name,
                    }
                  : null,
              }
            : null,
          wallet_balance: wallet ? Number(wallet.balance) : 0,
        };
      }),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async processWithdrawal(adminId: string, withdrawalId: string, status: number) {
    if (![1, 2].includes(status)) {
      throw new BadRequestException('Invalid withdrawal status');
    }

    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (Number(withdrawal.status) !== 0) {
      throw new BadRequestException('Withdrawal has been processed');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      withdrawal.status = status;
      withdrawal.processed_by = adminId;
      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      // Rejected -> refund the reserved amount back to wallet
      if (status === 2) {
        const wallet = await queryRunner.manager.findOne(ShopWallet, {
          where: { shop_id: withdrawal.shop_id },
        });
        if (!wallet) {
          throw new NotFoundException('Shop wallet not found');
        }

        wallet.balance = Number((Number(wallet.balance || 0) + Number(withdrawal.amount)).toFixed(2));
        await queryRunner.manager.save(wallet);

        const transaction = queryRunner.manager.create(WalletTransaction, {
          shop_id: withdrawal.shop_id,
          type: 'IN',
          amount: Number(withdrawal.amount),
          reference_id: `WITHDRAWAL_REJECTED:${withdrawal.id}`,
        });
        await queryRunner.manager.save(transaction);
      }

      const log = queryRunner.manager.create(AdminLog, {
        admin: { id: adminId } as any,
        action: 'PROCESS_WITHDRAWAL',
        target_type: 'WITHDRAWAL',
        target_id: withdrawal.id,
      });
      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();
      return {
        message: status === 1 ? 'Withdrawal approved' : 'Withdrawal rejected',
        withdrawal: {
          ...savedWithdrawal,
          amount: Number(savedWithdrawal.amount),
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
