import { Controller, Get, Post, Body, Patch, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser('id') userId: string, @Body() createShopDto: CreateShopDto) {
    return this.shopService.create(userId, createShopDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.shopService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-shop')
  findMyShop(@CurrentUser('id') userId: string) {
    return this.shopService.findByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('wallet')
  getWallet(@CurrentUser('id') userId: string) {
    return this.shopService.getWallet(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('my-shop')
  update(@CurrentUser('id') userId: string, @Body() updateShopDto: UpdateShopDto) {
    return this.shopService.update(userId, updateShopDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body('status') status: number,
    @Body('reason') reason?: string,
  ) {
    return this.shopService.updateStatus(id, adminId, status, reason);
  }
}
