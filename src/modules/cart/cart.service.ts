import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async getCart(userId: string) {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.variant', 'items.variant.product', 'items.variant.attributes', 'items.variant.attributes.attributeValue'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ user: { id: userId } as any });
      await this.cartRepository.save(cart);
      cart.items = [];
    }

    return cart;
  }

  async addItem(userId: string, addToCartDto: AddToCartDto) {
    const { variant_id, quantity } = addToCartDto;
    const cart = await this.getCart(userId);

    const variant = await this.variantRepository.findOne({
      where: { id: variant_id },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    let cartItem = await this.cartItemRepository.findOne({
      where: { cart_id: cart.id, variant_id },
    });

    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      cartItem = this.cartItemRepository.create({
        cart_id: cart.id,
        variant_id,
        quantity,
      });
    }

    // Check stock again for the final quantity
    if (variant.stock < cartItem.quantity) {
      throw new BadRequestException('Total quantity exceeds available stock');
    }

    await this.cartItemRepository.save(cartItem);
    return this.getCart(userId);
  }

  async updateItem(userId: string, updateCartItemDto: UpdateCartItemDto) {
    const { variant_id, quantity } = updateCartItemDto;
    const cart = await this.getCart(userId);

    const cartItem = await this.cartItemRepository.findOne({
      where: { cart_id: cart.id, variant_id },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    const variant = await this.variantRepository.findOne({
      where: { id: variant_id },
    });

    if (variant && variant.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    cartItem.quantity = quantity;
    await this.cartItemRepository.save(cartItem);

    return this.getCart(userId);
  }

  async removeItem(userId: string, variantId: string) {
    const cart = await this.getCart(userId);

    const cartItem = await this.cartItemRepository.findOne({
      where: { cart_id: cart.id, variant_id: variantId },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.cartItemRepository.remove(cartItem);
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getCart(userId);
    await this.cartItemRepository.delete({ cart_id: cart.id });
    return { message: 'Cart cleared successfully' };
  }
}
