import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  addItem(@CurrentUser('id') userId: string, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addItem(userId, addToCartDto);
  }

  @Patch('items')
  updateItem(@CurrentUser('id') userId: string, @Body() updateCartItemDto: UpdateCartItemDto) {
    return this.cartService.updateItem(userId, updateCartItemDto);
  }

  @Delete('items/:variantId')
  removeItem(@CurrentUser('id') userId: string, @Param('variantId', ParseUUIDPipe) variantId: string) {
    return this.cartService.removeItem(userId, variantId);
  }

  @Delete()
  clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
