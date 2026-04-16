import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderShop } from './entities/order-shop.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { ReturnRequest } from './entities/return-request.entity';
import { Refund } from './entities/refund.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';
import { UserAddress } from '../auth/entities/user_address.entity';
import { Shop } from '../shop/entities/shop.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, ReturnRequestStatus } from './order.constants';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { CreateReturnRequestDto, ReturnRequestDecision } from './dto/return-request.dto';
import { PromotionService } from '../promotion/promotion.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderShop)
    private readonly orderShopRepository: Repository<OrderShop>,
    @InjectRepository(ReturnRequest)
    private readonly returnRequestRepository: Repository<ReturnRequest>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
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
    private readonly promotionService: PromotionService,
    private dataSource: DataSource,
  ) { }

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

  private mapReturnRequest(request: ReturnRequest) {
    const orderItem = request.orderItem;
    const variant = orderItem?.variant;
    const product = variant?.product;
    const refund = request.refunds?.[0];

    return {
      id: request.id,
      user_id: request.user?.id ?? '',
      order_item_id: orderItem?.id ?? '',
      reason: request.reason,
      status: request.status,
      created_at: request.created_at?.toISOString?.() ?? new Date().toISOString(),
      refund: refund
        ? {
          id: refund.id,
          amount: Number(refund.amount),
          refunded_at: refund.refunded_at?.toISOString?.() ?? null,
        }
        : null,
      order_item: {
        id: orderItem?.id ?? '',
        quantity: Number(orderItem?.quantity ?? 0),
        price: Number(orderItem?.price ?? 0),
        subtotal: Number(orderItem?.subtotal ?? 0),
        product_name: product?.name ?? 'Sản phẩm',
        product_image: this.getProductImage(variant),
        variant_name: this.buildVariantName(variant),
      },
      order: {
        id: orderItem?.orderShop?.order?.id ?? '',
        status: orderItem?.orderShop?.order?.status ?? null,
        createdAt: orderItem?.orderShop?.order?.created_at?.toISOString?.() ?? null,
      },
    };
  }

  private async syncOrderRefundStatus(manager: EntityManager, orderId: string) {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      relations: ['orderShops', 'orderShops.items'],
    });

    if (!order) {
      return;
    }

    const allItemIds = order.orderShops.flatMap((orderShop) => orderShop.items.map((item) => item.id));
    if (allItemIds.length === 0) {
      return;
    }

    const refundedRequests = await manager
      .getRepository(ReturnRequest)
      .createQueryBuilder('request')
      .leftJoin('request.orderItem', 'orderItem')
      .leftJoin('orderItem.orderShop', 'orderShop')
      .leftJoin('orderShop.order', 'order')
      .where('order.id = :orderId', { orderId })
      .andWhere('request.status = :status', { status: ReturnRequestStatus.REFUNDED })
      .getMany();

    const refundedItemIds = new Set(
      refundedRequests.map((request) => request.orderItem?.id).filter(Boolean) as string[],
    );

    if (allItemIds.every((itemId) => refundedItemIds.has(itemId))) {
      order.status = OrderStatus.REFUNDED;
      await manager.save(Order, order);
    }
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
      discount_amount: Number(order.discount_amount || 0),
      promotion_id: order.promotion_id,
      payment_method: order.payment_method,
      shipping_address_id: order.shipping_address_id ?? null,
      shipping_address: {
        receiver_name: order.shipping_receiver_name ?? null,
        receiver_phone: order.shipping_receiver_phone ?? null,
        province: order.shipping_province ?? null,
        district: order.shipping_district ?? null,
        ward: order.shipping_ward ?? null,
        detail_address: order.shipping_detail_address ?? null,
      },
      items,
      createdAt: order.created_at?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: order.created_at?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items, payment_method, shipping_address_id, promotion_codes } = createOrderDto;

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
          discount_amount: number;
          promotion_id?: string;
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
          shopGroups.set(shop.id, { shop, items: [], subtotal: 0, discount_amount: 0 });
        }

        const group = shopGroups.get(shop.id)!;
        group.items.push({ variant, quantity, price: unitPrice, subtotal });
        group.subtotal += subtotal;

        variant.stock -= quantity;
        await queryRunner.manager.save(variant);
      }

      // Apply Promotions
      let orderDiscountAmount = 0;
      let orderPromotionId: string | undefined = undefined;

      if (promotion_codes && promotion_codes.length > 0) {
        for (const code of promotion_codes) {
          try {
            // Check if it's a shop/product promotion
            // We need to try to validate it for each shop group
            let appliedToShop = false;
            for (const group of shopGroups.values()) {
              try {
                const productIds = group.items.map((it) => it.variant.product.id);
                const validation = await this.promotionService.validateVoucher(
                  code,
                  userId,
                  group.subtotal,
                  group.shop.id,
                  productIds,
                );

                if (
                  validation.promotion.type === 1 || // PRODUCT
                  validation.promotion.type === 2 // SHOP
                ) {
                  group.discount_amount = validation.discount_amount;
                  group.promotion_id = validation.promotion.id;
                  appliedToShop = true;
                  break;
                }
              } catch (e) {
                // Not applicable to this shop, continue
              }
            }

            if (!appliedToShop) {
              // Try as system promotion
              const validation = await this.promotionService.validateVoucher(
                code,
                userId,
                totalAmount,
              );
              if (validation.promotion.type === 3) {
                // SYSTEM
                orderDiscountAmount = validation.discount_amount;
                orderPromotionId = validation.promotion.id;
              }
            }
          } catch (e) {
            // Invalid code or not applicable, ignore for now or handle as error
            throw new BadRequestException(`Promotion code ${code} is invalid or not applicable: ${e.message}`);
          }
        }
      }

      const finalTotalAmount = Math.max(0, totalAmount - orderDiscountAmount - Array.from(shopGroups.values()).reduce((sum, g) => sum + g.discount_amount, 0));

      const order = queryRunner.manager.create(Order, {
        user: { id: userId } as any,
        total_amount: finalTotalAmount,
        discount_amount: orderDiscountAmount,
        promotion_id: orderPromotionId,
        status: OrderStatus.PENDING,
        payment_method,
        shipping_address_id: address.id,
        shipping_receiver_name: address.receiver_name,
        shipping_receiver_phone: address.receiver_phone,
        shipping_province: address.province,
        shipping_district: address.district,
        shipping_ward: address.ward,
        shipping_detail_address: address.detail_address,
      });
      const savedOrder = await queryRunner.manager.save(order);

      // Record system promotion usage
      if (orderPromotionId) {
        await this.promotionService.recordUsage(queryRunner.manager, userId, orderPromotionId);
      }

      for (const group of shopGroups.values()) {
        const orderShop = queryRunner.manager.create(OrderShop, {
          order: savedOrder,
          shop: group.shop,
          subtotal: group.subtotal,
          discount_amount: group.discount_amount,
          promotion_id: group.promotion_id,
          status: OrderStatus.PENDING,
        });
        const savedOrderShop = await queryRunner.manager.save(orderShop);

        // Record shop/product promotion usage
        if (group.promotion_id) {
          await this.promotionService.recordUsage(queryRunner.manager, userId, group.promotion_id);
        }

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

  async createReturnRequest(userId: string, dto: CreateReturnRequestDto) {
    const orderItem = await this.orderRepository.manager.findOne(OrderItem, {
      where: { id: dto.order_item_id },
      relations: [
        'orderShop',
        'orderShop.order',
        'orderShop.order.user',
        'variant',
        'variant.product',
        'variant.product.images',
      ],
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const order = orderItem.orderShop?.order;
    if (!order || order.user?.id !== userId) {
      throw new NotFoundException('Order item not found');
    }

    if (Number(order.status) !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Only completed orders can be returned');
    }

    const existingRequest = await this.returnRequestRepository.findOne({
      where: { orderItem: { id: orderItem.id }, user: { id: userId } },
    });

    if (existingRequest) {
      throw new ConflictException('Return request already exists for this item');
    }

    const request = this.returnRequestRepository.create({
      orderItem: { id: orderItem.id } as any,
      user: { id: userId } as any,
      reason: dto.reason,
      status: ReturnRequestStatus.PENDING,
    });

    const saved = await this.returnRequestRepository.save(request);
    const result = await this.returnRequestRepository.findOne({
      where: { id: saved.id },
      relations: [
        'user',
        'orderItem',
        'orderItem.variant',
        'orderItem.variant.product',
        'orderItem.variant.product.images',
        'orderItem.orderShop',
        'orderItem.orderShop.order',
        'refunds',
      ],
    });

    return this.mapReturnRequest(result as ReturnRequest);
  }

  async findMyReturnRequests(userId: string) {
    const requests = await this.returnRequestRepository.find({
      where: { user: { id: userId } },
      relations: [
        'user',
        'orderItem',
        'orderItem.variant',
        'orderItem.variant.product',
        'orderItem.variant.product.images',
        'orderItem.orderShop',
        'orderItem.orderShop.order',
        'refunds',
      ],
      order: { created_at: 'DESC' },
    });

    return requests.map((request) => this.mapReturnRequest(request));
  }

  async findMyReturnRequestsForOrder(userId: string, orderId: string) {
    const requests = await this.returnRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('orderItem.orderShop', 'orderShop')
      .leftJoinAndSelect('orderShop.order', 'order')
      .leftJoinAndSelect('request.refunds', 'refund')
      .where('user.id = :userId', { userId })
      .andWhere('order.id = :orderId', { orderId })
      .orderBy('request.created_at', 'DESC')
      .getMany();

    return requests.map((request) => this.mapReturnRequest(request));
  }

  async findAllReturnRequests() {
    const requests = await this.returnRequestRepository.find({
      relations: [
        'user',
        'orderItem',
        'orderItem.variant',
        'orderItem.variant.product',
        'orderItem.variant.product.images',
        'orderItem.orderShop',
        'orderItem.orderShop.order',
        'refunds',
      ],
      order: { created_at: 'DESC' },
    });

    return requests.map((request) => this.mapReturnRequest(request));
  }

  async reviewReturnRequest(requestId: string, dto: { decision: ReturnRequestDecision }) {
    const request = await this.returnRequestRepository.findOne({
      where: { id: requestId },
      relations: [
        'user',
        'orderItem',
        'orderItem.variant',
        'orderItem.variant.product',
        'orderItem.variant.product.images',
        'orderItem.orderShop',
        'orderItem.orderShop.order',
        'refunds',
      ],
    });

    if (!request) {
      throw new NotFoundException('Return request not found');
    }

    if (Number(request.status) !== ReturnRequestStatus.PENDING) {
      throw new BadRequestException('Return request has already been processed');
    }

    if (dto.decision === ReturnRequestDecision.REJECTED) {
      request.status = ReturnRequestStatus.REJECTED;
      await this.returnRequestRepository.save(request);
      return this.mapReturnRequest(request);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      request.status = ReturnRequestStatus.REFUNDED;
      await queryRunner.manager.save(request);

      const refund = queryRunner.manager.create(Refund, {
        returnRequest: request,
        amount: Number(request.orderItem.subtotal),
        refunded_at: new Date(),
      });
      await queryRunner.manager.save(refund);

      const variant = await queryRunner.manager.findOne(ProductVariant, {
        where: { id: request.orderItem.variant.id },
      });

      if (variant) {
        variant.stock += Number(request.orderItem.quantity);
        await queryRunner.manager.save(variant);
      }

      await this.syncOrderRefundStatus(queryRunner.manager, request.orderItem.orderShop.order.id);

      await queryRunner.commitTransaction();

      const result = await this.returnRequestRepository.findOne({
        where: { id: request.id },
        relations: [
          'user',
          'orderItem',
          'orderItem.variant',
          'orderItem.variant.product',
          'orderItem.variant.product.images',
          'orderItem.orderShop',
          'orderItem.orderShop.order',
          'refunds',
        ],
      });

      return this.mapReturnRequest(result as ReturnRequest);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOneForUser(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
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
