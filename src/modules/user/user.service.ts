import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { WalletQueryDto, TopupWalletDto } from './dto/wallet.dto';
import { WalletTransaction } from '../order/entities/wallet_transaction.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
  ) {}

  private readonly USER_WALLET_REF_PREFIX = 'USER_WALLET:';

  private mapAddress(address: UserAddress) {
    return {
      ...address,
      phone_number: address.receiver_phone,
    };
  }

  private normalizeAddressPayload(
    payload: CreateAddressDto | UpdateAddressDto,
  ): Partial<UserAddress> {
    const receiverPhone =
      (payload as CreateAddressDto).receiver_phone ??
      (payload as CreateAddressDto).phone_number;

    const normalized: Partial<UserAddress> = {};

    if (payload.receiver_name !== undefined) {
      normalized.receiver_name = payload.receiver_name;
    }
    if (receiverPhone !== undefined) {
      normalized.receiver_phone = receiverPhone;
    }
    if (payload.province !== undefined) {
      normalized.province = payload.province;
    }
    if (payload.district !== undefined) {
      normalized.district = payload.district;
    }
    if (payload.ward !== undefined) {
      normalized.ward = payload.ward;
    }
    if (payload.detail_address !== undefined) {
      normalized.detail_address = payload.detail_address;
    }
    if (payload.is_default !== undefined) {
      normalized.is_default = payload.is_default;
    }

    return normalized;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateProfileDto);
    await this.userRepository.save(user);

    const { password_hash: _, ...userInfo } = user;
    return userInfo;
  }

  // Address Management
  private async getAddressesEntity(userId: string) {
    return this.addressRepository.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  async getAddresses(userId: string) {
    const addresses = await this.getAddressesEntity(userId);
    return addresses.map((address) => this.mapAddress(address));
  }

  private async getAddressEntity(userId: string, addressId: string) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async getAddress(userId: string, addressId: string) {
    const address = await this.getAddressEntity(userId, addressId);
    return this.mapAddress(address);
  }

  async createAddress(userId: string, createAddressDto: CreateAddressDto) {
    const addresses = await this.getAddressesEntity(userId);

    // If it's the first address, make it default automatically
    let is_default = createAddressDto.is_default || 0;
    if (addresses.length === 0) {
      is_default = 1;
    } else if (is_default === 1) {
      // Unset previous default
      await this.addressRepository.update(
        { user_id: userId, is_default: 1 },
        { is_default: 0 }
      );
    }

    const normalizedPayload = this.normalizeAddressPayload(createAddressDto);

    const newAddress = this.addressRepository.create({
      ...normalizedPayload,
      user_id: userId,
      is_default,
    });

    const saved = await this.addressRepository.save(newAddress);
    return this.mapAddress(saved);
  }

  async updateAddress(userId: string, addressId: string, updateAddressDto: UpdateAddressDto) {
    const address = await this.getAddressEntity(userId, addressId);

    if (updateAddressDto.is_default === 1 && address.is_default !== 1) {
      // Unset previous default
      await this.addressRepository.update(
        { user_id: userId, is_default: 1 },
        { is_default: 0 }
      );
    }

    Object.assign(address, this.normalizeAddressPayload(updateAddressDto));
    const saved = await this.addressRepository.save(address);
    return this.mapAddress(saved);
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.getAddressEntity(userId, addressId);

    await this.addressRepository.remove(address);

    // If the deleted address was default, set the latest remaining as default
    if (address.is_default === 1) {
      const remainingAddresses = await this.getAddressesEntity(userId);
      if (remainingAddresses.length > 0) {
        remainingAddresses[0].is_default = 1;
        await this.addressRepository.save(remainingAddresses[0]);
      }
    }

    return { message: 'Address deleted successfully' };
  }

  async setAddressDefault(userId: string, addressId: string) {
    const address = await this.getAddressEntity(userId, addressId);

    if (address.is_default === 1) {
      return this.mapAddress(address);
    }

    await this.addressRepository.update(
      { user_id: userId, is_default: 1 },
      { is_default: 0 }
    );

    address.is_default = 1;
    const saved = await this.addressRepository.save(address);
    return this.mapAddress(saved);
  }

  async getWallet(userId: string, query: WalletQueryDto) {
    const { page = 1, limit = 20 } = query;

    const txQuery = this.walletTransactionRepository
      .createQueryBuilder('tx')
      .where('tx.shop_id = :userId', { userId })
      .andWhere('tx.reference_id LIKE :prefix', {
        prefix: `${this.USER_WALLET_REF_PREFIX}%`,
      });

    const [transactions, total, aggregate] = await Promise.all([
      txQuery
        .clone()
        .orderBy('tx.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      txQuery.clone().getCount(),
      txQuery
        .clone()
        .select(
          "COALESCE(SUM(CASE WHEN tx.type = 'IN' THEN tx.amount ELSE -tx.amount END), 0)",
          'balance',
        )
        .getRawOne(),
    ]);

    return {
      balance: Number(aggregate?.balance || 0),
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

  async topupWallet(userId: string, dto: TopupWalletDto) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Topup amount must be greater than 0');
    }

    const referenceSuffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const transaction = this.walletTransactionRepository.create({
      shop_id: userId,
      type: 'IN',
      amount,
      reference_id: `${this.USER_WALLET_REF_PREFIX}${referenceSuffix}`,
    });
    const saved = await this.walletTransactionRepository.save(transaction);

    const wallet = await this.getWallet(userId, { page: 1, limit: 20 });
    return {
      message: 'Topup successful',
      transaction: {
        id: saved.id,
        type: saved.type,
        amount: Number(saved.amount),
        reference_id: saved.reference_id,
        created_at: saved.created_at,
      },
      wallet,
    };
  }
}
