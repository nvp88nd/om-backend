import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { WalletTransaction } from '../order/entities/wallet_transaction.entity';
import { UserWallet } from './entities/user-wallet.entity';

export type UserWalletTxType = 'IN' | 'OUT';

@Injectable()
export class UserWalletService {
    private readonly USER_WALLET_REF_PREFIX = 'USER_WALLET:';

    constructor(
        @InjectRepository(UserWallet)
        private readonly userWalletRepository: Repository<UserWallet>,
        @InjectRepository(WalletTransaction)
        private readonly walletTransactionRepository: Repository<WalletTransaction>,
        private readonly dataSource: DataSource,
    ) { }

    private normalizeAmount(amountInput: number) {
        const amount = Number(Number(amountInput).toFixed(2));
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }
        return amount;
    }

    private normalizeReferenceId(referenceId: string) {
        const trimmed = String(referenceId || '').trim();
        if (!trimmed) {
            throw new BadRequestException('Reference id is required');
        }

        return trimmed.startsWith(this.USER_WALLET_REF_PREFIX)
            ? trimmed
            : `${this.USER_WALLET_REF_PREFIX}${trimmed}`;
    }

    private async runInTransaction<T>(
        manager: EntityManager | undefined,
        work: (manager: EntityManager) => Promise<T>,
    ): Promise<T> {
        if (manager) {
            return work(manager);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const result = await work(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async getOrCreateWalletLocked(
        manager: EntityManager,
        userId: string,
    ): Promise<UserWallet> {
        let wallet = await manager
            .getRepository(UserWallet)
            .createQueryBuilder('wallet')
            .setLock('pessimistic_write')
            .where('wallet.user_id = :userId', { userId })
            .getOne();

        if (wallet) {
            return wallet;
        }

        try {
            await manager.getRepository(UserWallet).insert({
                user_id: userId,
                balance: 0,
            });
        } catch {
            // Concurrent request may have inserted the row.
        }

        wallet = await manager
            .getRepository(UserWallet)
            .createQueryBuilder('wallet')
            .setLock('pessimistic_write')
            .where('wallet.user_id = :userId', { userId })
            .getOne();

        if (!wallet) {
            throw new NotFoundException('User wallet not found');
        }

        return wallet;
    }

    async getWalletSummary(userId: string, page = 1, limit = 20) {
        const wallet =
            (await this.userWalletRepository.findOne({ where: { user_id: userId } })) ||
            this.userWalletRepository.create({ user_id: userId, balance: 0 });

        const txQuery = this.walletTransactionRepository
            .createQueryBuilder('tx')
            .where('tx.shop_id = :userId', { userId })
            .andWhere('tx.reference_id LIKE :prefix', {
                prefix: `${this.USER_WALLET_REF_PREFIX}%`,
            });

        const [transactions, total] = await Promise.all([
            txQuery
                .clone()
                .orderBy('tx.created_at', 'DESC')
                .skip((page - 1) * limit)
                .take(limit)
                .getMany(),
            txQuery.clone().getCount(),
        ]);

        return {
            balance: Number(wallet.balance || 0),
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            transactions: transactions.map((tx) => ({
                id: tx.id,
                type: tx.type,
                amount: Number(tx.amount),
                reference_id: tx.reference_id,
                created_at: tx.created_at,
            })),
        };
    }

    private async applyTransaction(
        manager: EntityManager,
        userId: string,
        type: UserWalletTxType,
        amountInput: number,
        referenceId: string,
    ) {
        const amount = this.normalizeAmount(amountInput);
        const normalizedRef = this.normalizeReferenceId(referenceId);

        const existing = await manager.getRepository(WalletTransaction).findOne({
            where: {
                shop_id: userId,
                reference_id: normalizedRef,
            },
        });

        if (existing) {
            const wallet = await this.getOrCreateWalletLocked(manager, userId);
            return {
                wallet,
                transaction: existing,
                is_new_transaction: false,
            };
        }

        const wallet = await this.getOrCreateWalletLocked(manager, userId);
        const currentBalance = Number(wallet.balance || 0);

        if (type === 'OUT' && currentBalance < amount) {
            throw new BadRequestException('Insufficient wallet balance');
        }

        const nextBalance = type === 'IN' ? currentBalance + amount : currentBalance - amount;
        wallet.balance = Number(nextBalance.toFixed(2));
        await manager.getRepository(UserWallet).save(wallet);

        const transaction = manager.getRepository(WalletTransaction).create({
            shop_id: userId,
            type,
            amount,
            reference_id: normalizedRef,
        });
        const savedTx = await manager.getRepository(WalletTransaction).save(transaction);

        return {
            wallet,
            transaction: savedTx,
            is_new_transaction: true,
        };
    }

    async credit(
        userId: string,
        amount: number,
        referenceId: string,
        manager?: EntityManager,
    ) {
        return this.runInTransaction(manager, (txManager) =>
            this.applyTransaction(txManager, userId, 'IN', amount, referenceId),
        );
    }

    async debit(
        userId: string,
        amount: number,
        referenceId: string,
        manager?: EntityManager,
    ) {
        return this.runInTransaction(manager, (txManager) =>
            this.applyTransaction(txManager, userId, 'OUT', amount, referenceId),
        );
    }
}
