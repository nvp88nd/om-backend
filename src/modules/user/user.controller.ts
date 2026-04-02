import { Controller, Get, Body, Patch, Post, Delete, Param, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { WalletQueryDto, TopupWalletDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('profile')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return this.userService.updateProfile(userId, updateProfileDto);
  }

  // Address Endpoints
  @Get('addresses')
  getAddresses(@CurrentUser('id') userId: string) {
    return this.userService.getAddresses(userId);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  createAddress(
    @CurrentUser('id') userId: string,
    @Body() createAddressDto: CreateAddressDto
  ) {
    return this.userService.createAddress(userId, createAddressDto);
  }

  @Get('addresses/:id')
  getAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string
  ) {
    return this.userService.getAddress(userId, addressId);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto
  ) {
    return this.userService.updateAddress(userId, addressId, updateAddressDto);
  }

  @Delete('addresses/:id')
  deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string
  ) {
    return this.userService.deleteAddress(userId, addressId);
  }

  @Patch('addresses/:id/default')
  setAddressDefault(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string
  ) {
    return this.userService.setAddressDefault(userId, addressId);
  }

  @Get('wallet')
  getWallet(
    @CurrentUser('id') userId: string,
    @Query() query: WalletQueryDto,
  ) {
    return this.userService.getWallet(userId, query);
  }

  @Post('wallet/topup')
  @HttpCode(HttpStatus.OK)
  topupWallet(
    @CurrentUser('id') userId: string,
    @Body() dto: TopupWalletDto,
  ) {
    return this.userService.topupWallet(userId, dto);
  }
}
