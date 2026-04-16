import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreatePromotionDto,
  PromotionFilterDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { PromotionService } from './promotion.service';

@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createPromotionDto: CreatePromotionDto, @CurrentUser('id') userId: string) {
    return this.promotionService.create(createPromotionDto, { role: 'ADMIN', userId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER')
  @Post('my-shop')
  createForMyShop(
    @CurrentUser('id') userId: string,
    @Body() createPromotionDto: CreatePromotionDto,
  ) {
    return this.promotionService.create(createPromotionDto, { role: 'SHOP_OWNER', userId });
  }

  @Get()
  findAll(@Query() filter: PromotionFilterDto) {
    return this.promotionService.findAll(filter);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/list')
  findForAdmin(@Query() filter: PromotionFilterDto) {
    return this.promotionService.findForAdmin(filter);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER')
  @Get('my-shop')
  findForSeller(@CurrentUser('id') userId: string, @Query() filter: PromotionFilterDto) {
    return this.promotionService.findForSeller(userId, filter);
  }

  @Get('active')
  findActive(@Query() filter: PromotionFilterDto) {
    return this.promotionService.findActive(filter);
  }

  @Get('product/:productId')
  getForProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.promotionService.getPromotionsForProduct(productId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('collect/:id')
  collect(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.promotionService.collectVoucher(userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/vouchers')
  getMyVouchers(@CurrentUser('id') userId: string) {
    return this.promotionService.getMyVouchers(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate/:code')
  validate(
    @Param('code') code: string,
    @CurrentUser('id') userId: string,
    @Query('subtotal') subtotal: string,
    @Query('shop_id') shopId?: string,
    @Query('product_ids') productIds?: string,
  ) {
    const pIds = productIds ? productIds.split(',') : undefined;
    return this.promotionService.validateVoucher(code, userId, Number(subtotal), shopId, pIds);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.promotionService.update(id, updatePromotionDto, { role: 'ADMIN', userId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER')
  @Patch('my-shop/:id')
  updateForMyShop(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionService.update(id, updatePromotionDto, { role: 'SHOP_OWNER', userId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.promotionService.remove(id, { role: 'ADMIN', userId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER')
  @Delete('my-shop/:id')
  removeForMyShop(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.promotionService.remove(id, { role: 'SHOP_OWNER', userId });
  }
}
