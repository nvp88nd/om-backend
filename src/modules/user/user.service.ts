import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
  ) {}

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
  async getAddresses(userId: string) {
    return this.addressRepository.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  async getAddress(userId: string, addressId: string) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, user_id: userId },
    });
    
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async createAddress(userId: string, createAddressDto: CreateAddressDto) {
    const addresses = await this.getAddresses(userId);
    
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

    const newAddress = this.addressRepository.create({
      ...createAddressDto,
      user_id: userId,
      is_default,
    });

    return this.addressRepository.save(newAddress);
  }

  async updateAddress(userId: string, addressId: string, updateAddressDto: UpdateAddressDto) {
    const address = await this.getAddress(userId, addressId);

    if (updateAddressDto.is_default === 1 && address.is_default !== 1) {
      // Unset previous default
      await this.addressRepository.update(
        { user_id: userId, is_default: 1 },
        { is_default: 0 }
      );
    }

    Object.assign(address, updateAddressDto);
    return this.addressRepository.save(address);
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.getAddress(userId, addressId);

    await this.addressRepository.remove(address);

    // If the deleted address was default, set the latest remaining as default
    if (address.is_default === 1) {
      const remainingAddresses = await this.getAddresses(userId);
      if (remainingAddresses.length > 0) {
        remainingAddresses[0].is_default = 1;
        await this.addressRepository.save(remainingAddresses[0]);
      }
    }

    return { message: 'Address deleted successfully' };
  }

  async setAddressDefault(userId: string, addressId: string) {
    const address = await this.getAddress(userId, addressId);

    if (address.is_default === 1) {
      return address;
    }

    await this.addressRepository.update(
      { user_id: userId, is_default: 1 },
      { is_default: 0 }
    );

    address.is_default = 1;
    return this.addressRepository.save(address);
  }
}
