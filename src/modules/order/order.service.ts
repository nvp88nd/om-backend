import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderShop } from './entities/order-shop.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { Shop } from '../shop/entities/shop.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus } from './order.constants';

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
    private dataSource: DataSource,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items, payment_method, shipping_address_id } = createOrderDto;

    // 1. Verify address
    const address = await this.addressRepository.findOne({
      where: { id: shipping_address_id, user_id: userId },
    });
    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const shopGroups: Map<string, { shop: Shop; items: any[]; subtotal: number }> = new Map();

      // 2. Validate variants, stock, and group by shop
      for (const itemDto of items) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: itemDto.variant_id },
          relations: ['product', 'product.shop'],
        });

        if (!variant) {
          throw new NotFoundException(`Product variant ${itemDto.variant_id} not found`);
        }

        if (variant.stock < itemDto.quantity) {
          throw new ConflictException(`Insufficient stock for ${variant.product.name} (Available: ${variant.stock})`);
        }

        const shop = variant.product.shop;
        const subtotal = Number(variant.price) * itemDto.quantity;
        totalAmount += subtotal;

        if (!shopGroups.has(shop.id)) {
          shopGroups.set(shop.id, { shop, items: [], subtotal: 0 });
        }
        
        const group = shopGroups.get(shop.id)!;
        group.items.push({ variant, quantity: itemDto.quantity, price: variant.price, subtotal });
        group.subtotal += subtotal;

        // Decrease stock
        variant.stock -= itemDto.quantity;
        await queryRunner.manager.save(variant);
      }

      // 3. Create Main Order
      const order = queryRunner.manager.create(Order, {
        user: { id: userId } as any,
        total_amount: totalAmount,
        status: OrderStatus.PENDING,
        payment_method,
      });
      const savedOrder = await queryRunner.manager.save(order);

      // 4. Create OrderShops and OrderItems
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

      // 5. Create Initial Payment
      const payment = queryRunner.manager.create(Payment, {
        order: savedOrder,
        provider: payment_method,
        status: PaymentStatus.PENDING,
      });
      await queryRunner.manager.save(payment);

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
        'orderShops.items.variant.product',
        'payments',
      ],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findAllForUser(userId: string) {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      relations: ['orderShops', 'orderShops.shop', 'orderShops.items', 'orderShops.items.variant.product'],
      order: { created_at: 'DESC' },
    });
  }

  // Shop view
  async findAllForShop(userId: string) {
    const shop = await this.shopRepository.findOne({ where: { owner: { id: userId } } });
    if (!shop) {
      throw new BadRequestException('User does not have a shop');
    }

    return this.orderShopRepository.find({
      where: { shop: { id: shop.id } },
      relations: ['order', 'order.user', 'items', 'items.variant.product'],
      order: { id: 'DESC' }, // Assuming no created_at on OrderShop, use id or join order
    });
  }

  async updateOrderShopStatus(userId: string, orderShopId: string, status: OrderStatus) {
    const shop = await this.shopRepository.findOne({ where: { owner: { id: userId } } });
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

    orderShop.status = status;
    await this.orderShopRepository.save(orderShop);

    // Sync main order status if necessary
    // Example: If all OrderShops are completed, mark main order as completed
    await this.syncMainOrderStatus(orderShop.order.id);

    return orderShop;
  }

  private async syncMainOrderStatus(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderShops'],
    });

    if (!order) return;

    const statuses = order.orderShops.map(os => os.status);
    
    if (statuses.every(s => s === OrderStatus.COMPLETED)) {
      order.status = OrderStatus.COMPLETED;
      await this.orderRepository.save(order);
    } else if (statuses.every(s => s === OrderStatus.CANCELLED)) {
      order.status = OrderStatus.CANCELLED;
      await this.orderRepository.save(order);
    } else if (statuses.some(s => s === OrderStatus.SHIPPING)) {
      order.status = OrderStatus.SHIPPING;
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
      throw new BadRequestException('Cannot cancel order that is already being processed');
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

        // Restore stock
        const items = await queryRunner.manager.find(OrderItem, {
          where: { orderShop: { id: orderShop.id } },
          relations: ['variant'],
        });

        for (const item of items) {
          const variant = item.variant;
          variant.stock += item.quantity;
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
