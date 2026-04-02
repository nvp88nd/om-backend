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

  private async getOrCreateCartEntity(userId: string) {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!cart) {
      cart = this.cartRepository.create({ user: { id: userId } as any });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  private async loadCartWithDetails(userId: string) {
    const cart = await this.getOrCreateCartEntity(userId);
    return this.cartRepository.findOne({
      where: { id: cart.id },
      relations: [
        'items',
        'items.variant',
        'items.variant.product',
        'items.variant.product.images',
        'items.variant.product.shop',
        'items.variant.attributes',
        'items.variant.attributes.attributeValue',
      ],
    });
  }

  private mapCartResponse(cart: Cart | null) {
    const items = (cart?.items ?? []).map((item) => {
      const variant = item.variant;
      const product = variant?.product;
      const mainImage =
        product?.images?.find((img) => img.is_main)?.image_url ??
        product?.images?.[0]?.image_url;

      const variantName = (variant?.attributes ?? [])
        .map((attribute) => attribute.attributeValue?.value)
        .filter(Boolean)
        .join(', ');

      const unitPrice = Number(variant?.price ?? 0);
      const stock = Number(variant?.stock ?? 0);

      return {
        id: product?.id ?? variant?.id ?? item.variant_id,
        variant_id: item.variant_id,
        quantity: Number(item.quantity),
        product_name: product?.name ?? 'Sản phẩm',
        product_image: mainImage,
        variant_name: variantName || 'Mặc định',
        price: unitPrice,
        stock,
      };
    });

    const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
    const total_amount = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    return {
      items,
      total_items,
      total_amount,
    };
  }

  async getCart(userId: string) {
    const cart = await this.loadCartWithDetails(userId);
    return this.mapCartResponse(cart);
  }

  async addItem(userId: string, addToCartDto: AddToCartDto) {
    const { variant_id, quantity } = addToCartDto;
    const cart = await this.getOrCreateCartEntity(userId);

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
    const cart = await this.getOrCreateCartEntity(userId);

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
    const cart = await this.getOrCreateCartEntity(userId);

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
    const cart = await this.getOrCreateCartEntity(userId);
    await this.cartItemRepository.delete({ cart_id: cart.id });
    return { message: 'Cart cleared successfully' };
  }
}
