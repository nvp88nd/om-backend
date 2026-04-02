import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderShop } from './entities/order-shop.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { Shop } from '../shop/entities/shop.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus } from './order.constants';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderShop)
    private readonly orderShopRepository: Repository<OrderShop>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private dataSource: DataSource,
  ) {}

  private toFrontendOrderStatus(status: number): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'PENDING';
      case OrderStatus.PROCESSING:
        return 'PROCESSING';
      case OrderStatus.SHIPPING:
        return 'SHIPPED';
      case OrderStatus.COMPLETED:
        return 'DELIVERED';
      case OrderStatus.CANCELLED:
        return 'CANCELLED';
      case OrderStatus.REFUNDED:
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }

  private parseOrderStatusInput(status: unknown): OrderStatus {
    const numericStatuses = Object.values(OrderStatus).filter(
      (value) => typeof value === 'number',
    ) as number[];

    if (typeof status === 'number' && numericStatuses.includes(status)) {
      return status as OrderStatus;
    }

    if (typeof status === 'string') {
      const trimmed = status.trim();
      if (!trimmed) {
        throw new BadRequestException('Order status is required');
      }

      const numericFromString = Number(trimmed);
      if (
        Number.isInteger(numericFromString) &&
        numericStatuses.includes(numericFromString)
      ) {
        return numericFromString as OrderStatus;
      }

      const normalized = trimmed.toUpperCase();
      const mapping: Record<string, OrderStatus> = {
        PENDING: OrderStatus.PENDING,
        PROCESSING: OrderStatus.PROCESSING,
        SHIPPING: OrderStatus.SHIPPING,
        SHIPPED: OrderStatus.SHIPPING,
        COMPLETED: OrderStatus.COMPLETED,
        DELIVERED: OrderStatus.COMPLETED,
        CANCELLED: OrderStatus.CANCELLED,
        REFUNDED: OrderStatus.REFUNDED,
        RETURNED: OrderStatus.REFUNDED,
      };

      if (mapping[normalized] !== undefined) {
        return mapping[normalized];
      }
    }

    throw new BadRequestException('Invalid order status');
  }

  private buildVariantName(variant: ProductVariant): string {
    const values = (variant.attributes ?? [])
      .map((attribute) => attribute.attributeValue?.value)
      .filter(Boolean);

    return values.length ? values.join(', ') : 'Mặc định';
  }

  private getProductImage(variant: ProductVariant): string | undefined {
    const images = variant.product?.images ?? [];
    return images.find((image) => image.is_main)?.image_url ?? images[0]?.image_url;
  }

  private mapOrderForFrontend(order: Order) {
    const items = (order.orderShops ?? []).flatMap((orderShop) =>
      (orderShop.items ?? []).map((item) => ({
        id: item.id,
        variant_id: item.variant?.id,
        quantity: Number(item.quantity),
        price: Number(item.price),
        product_name: item.variant?.product?.name ?? 'Sản phẩm',
        product_image: this.getProductImage(item.variant),
        variant_name: this.buildVariantName(item.variant),
      })),
    );

    return {
      id: order.id,
      user_id: order.user?.id ?? '',
      status: this.toFrontendOrderStatus(Number(order.status)),
      total_amount: Number(order.total_amount),
      payment_method: order.payment_method,
      shipping_address_id: null,
      items,
      createdAt: order.created_at?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: order.created_at?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items, payment_method, shipping_address_id } = createOrderDto;

    if (!items?.length) {
      throw new BadRequestException('Order items cannot be empty');
    }

    const address = await this.addressRepository.findOne({
      where: { id: shipping_address_id, user_id: userId },
    });
    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    const mergedItems = new Map<string, number>();
    for (const item of items) {
      const current = mergedItems.get(item.variant_id) ?? 0;
      mergedItems.set(item.variant_id, current + item.quantity);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const shopGroups: Map<
        string,
        {
          shop: Shop;
          items: Array<{
            variant: ProductVariant;
            quantity: number;
            price: number;
            subtotal: number;
          }>;
          subtotal: number;
        }
      > = new Map();

      for (const [variantId, quantity] of mergedItems.entries()) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: variantId },
          relations: ['product', 'product.shop'],
        });

        if (!variant) {
          throw new NotFoundException(`Product variant ${variantId} not found`);
        }

        if (!variant.product || variant.product.status !== 2) {
          throw new ConflictException(`Product ${variant.product?.name ?? ''} is not available`);
        }

        if (!variant.product.shop || variant.product.shop.status !== 1) {
          throw new ConflictException('Shop is not active');
        }

        if (variant.stock < quantity) {
          throw new ConflictException(
            `Insufficient stock for ${variant.product.name} (Available: ${variant.stock})`,
          );
        }

        const shop = variant.product.shop;
        const unitPrice = Number(variant.price);
        const subtotal = unitPrice * quantity;
        totalAmount += subtotal;

        if (!shopGroups.has(shop.id)) {
          shopGroups.set(shop.id, { shop, items: [], subtotal: 0 });
        }

        const group = shopGroups.get(shop.id)!;
        group.items.push({ variant, quantity, price: unitPrice, subtotal });
        group.subtotal += subtotal;

        variant.stock -= quantity;
        await queryRunner.manager.save(variant);
      }

      const order = queryRunner.manager.create(Order, {
        user: { id: userId } as any,
        total_amount: totalAmount,
        status: OrderStatus.PENDING,
        payment_method,
      });
      const savedOrder = await queryRunner.manager.save(order);

      for (const group of shopGroups.values()) {
        const orderShop = queryRunner.manager.create(OrderShop, {
          order: savedOrder,
          shop: group.shop,
          subtotal: group.subtotal,
          status: OrderStatus.PENDING,
        });
        const savedOrderShop = await queryRunner.manager.save(orderShop);

        for (const item of group.items) {
          const orderItem = queryRunner.manager.create(OrderItem, {
            orderShop: savedOrderShop,
            variant: item.variant,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          });
          await queryRunner.manager.save(orderItem);
        }
      }

      const payment = queryRunner.manager.create(Payment, {
        order: savedOrder,
        provider: payment_method,
        status: PaymentStatus.PENDING,
      });
      await queryRunner.manager.save(payment);

      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
      });

      if (cart) {
        await queryRunner.manager.delete(CartItem, {
          cart_id: cart.id,
          variant_id: In(Array.from(mergedItems.keys())),
        });
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedOrder.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'user',
        'orderShops',
        'orderShops.shop',
        'orderShops.items',
        'orderShops.items.variant',
        'orderShops.items.variant.attributes',
        'orderShops.items.variant.attributes.attributeValue',
        'orderShops.items.variant.product',
        'orderShops.items.variant.product.images',
        'payments',
      ],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.mapOrderForFrontend(order);
  }

  async findAllForUser(userId: string) {
    const orders = await this.orderRepository.find({
      where: { user: { id: userId } },
      relations: [
        'user',
        'orderShops',
        'orderShops.shop',
        'orderShops.items',
        'orderShops.items.variant',
        'orderShops.items.variant.attributes',
        'orderShops.items.variant.attributes.attributeValue',
        'orderShops.items.variant.product',
        'orderShops.items.variant.product.images',
      ],
      order: { created_at: 'DESC' },
    });

    return orders.map((order) => this.mapOrderForFrontend(order));
  }

  async findAllForShop(userId: string) {
    const shop = await this.shopRepository.findOne({
      where: { owner: { id: userId } },
    });
    if (!shop) {
      throw new BadRequestException('User does not have a shop');
    }

    return this.orderShopRepository.find({
      where: { shop: { id: shop.id } },
      relations: ['order', 'order.user', 'items', 'items.variant', 'items.variant.product'],
      order: { id: 'DESC' },
    });
  }

  async updateOrderShopStatus(
    userId: string,
    orderShopId: string,
    statusInput: unknown,
  ) {
    const shop = await this.shopRepository.findOne({
      where: { owner: { id: userId } },
    });
    if (!shop) {
      throw new BadRequestException('User does not have a shop');
    }

    const orderShop = await this.orderShopRepository.findOne({
      where: { id: orderShopId, shop: { id: shop.id } },
      relations: ['order'],
    });

    if (!orderShop) {
      throw new NotFoundException('Order not found for this shop');
    }

    const status = this.parseOrderStatusInput(statusInput);
    orderShop.status = status;
    await this.orderShopRepository.save(orderShop);

    await this.syncMainOrderStatus(orderShop.order.id);

    return orderShop;
  }

  private async syncMainOrderStatus(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderShops'],
    });

    if (!order) {
      return;
    }

    const statuses = order.orderShops.map((orderShop) => orderShop.status);
    const current = order.status;
    let nextStatus = current;

    if (statuses.every((status) => status === OrderStatus.COMPLETED)) {
      nextStatus = OrderStatus.COMPLETED;
    } else if (statuses.every((status) => status === OrderStatus.CANCELLED)) {
      nextStatus = OrderStatus.CANCELLED;
    } else if (statuses.some((status) => status === OrderStatus.SHIPPING)) {
      nextStatus = OrderStatus.SHIPPING;
    } else if (statuses.some((status) => status === OrderStatus.PROCESSING)) {
      nextStatus = OrderStatus.PROCESSING;
    } else {
      nextStatus = OrderStatus.PENDING;
    }

    if (nextStatus !== current) {
      order.status = nextStatus;
      await this.orderRepository.save(order);
    }
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: ['orderShops'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Cannot cancel order that is already being processed',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(order);

      for (const orderShop of order.orderShops) {
        orderShop.status = OrderStatus.CANCELLED;
        await queryRunner.manager.save(orderShop);

        const items = await queryRunner.manager.find(OrderItem, {
          where: { orderShop: { id: orderShop.id } },
          relations: ['variant'],
        });

        for (const item of items) {
          const variant = item.variant;
          variant.stock += Number(item.quantity);
          await queryRunner.manager.save(variant);
        }
      }

      await queryRunner.commitTransaction();
      return { message: 'Order cancelled successfully' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
