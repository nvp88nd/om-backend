import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { Role } from '../modules/auth/entities/role.entity';
import { User } from '../modules/auth/entities/user.entity';
import { UserAddress } from '../modules/auth/entities/user_address.entity';
import { Shop } from '../modules/shop/entities/shop.entity';
import { ShopWallet } from '../modules/shop/entities/shop-wallet.entity';
import { Category } from '../modules/product/entities/category.entity';
import { Product } from '../modules/product/entities/product.entity';
import { ProductImage } from '../modules/product/entities/product-image.entity';
import { ProductVariant } from '../modules/product/entities/product-variant.entity';
import { Cart } from '../modules/cart/entities/cart.entity';
import { CartItem } from '../modules/cart/entities/cart-item.entity';
import { Order } from '../modules/order/entities/order.entity';
import { OrderShop } from '../modules/order/entities/order-shop.entity';
import { OrderItem } from '../modules/order/entities/order-item.entity';
import { Payment } from '../modules/order/entities/payment.entity';
import { OrderStatus, PaymentStatus } from '../modules/order/order.constants';

async function ensureRole(
  manager: any,
  payload: { id: number; code: string; name: string },
) {
  let role = await manager.findOne(Role, { where: { id: payload.id } });
  if (!role) {
    role = manager.create(Role, payload);
    role = await manager.save(Role, role);
  }
  return role;
}

async function ensureUser(
  manager: any,
  payload: { email: string; full_name: string; role: Role; status?: number; avatar_url?: string },
) {
  let user = await manager.findOne(User, { where: { email: payload.email } });
  if (user) {
    return user;
  }

  const password_hash = await bcrypt.hash('123456', 10);
  user = manager.create(User, {
    email: payload.email,
    password_hash,
    full_name: payload.full_name,
    status: payload.status ?? 1,
    role: payload.role,
    avatar_url: payload.avatar_url,
  });
  return manager.save(User, user);
}

async function ensureShop(
  manager: any,
  payload: {
    owner: User;
    name: string;
    slug: string;
    description: string;
    address: string;
    status?: number;
    logo_url?: string;
  },
) {
  let shop = await manager.findOne(Shop, { where: { slug: payload.slug } });
  if (!shop) {
    shop = manager.create(Shop, {
      owner: payload.owner,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      address: payload.address,
      status: payload.status ?? 1,
      logo_url: payload.logo_url,
    });
    shop = await manager.save(Shop, shop);
  }

  const wallet = await manager.findOne(ShopWallet, {
    where: { shop_id: shop.id },
  });
  if (!wallet) {
    await manager.save(
      ShopWallet,
      manager.create(ShopWallet, {
        shop_id: shop.id,
        balance: 0,
      }),
    );
  }

  return shop;
}

async function ensureCategory(
  manager: any,
  payload: { name: string; slug: string },
) {
  let category = await manager.findOne(Category, { where: { slug: payload.slug } });
  if (!category) {
    category = manager.create(Category, payload);
    category = await manager.save(Category, category);
  }
  return category;
}

async function ensureProductWithVariants(
  manager: any,
  payload: {
    shop: Shop;
    category: Category;
    name: string;
    slug: string;
    base_price: number;
    image_url: string;
    variants: Array<{ sku: string; price: number; stock: number }>;
  },
) {
  let product = await manager.findOne(Product, {
    where: { slug: payload.slug },
    relations: ['images'],
  });

  if (!product) {
    product = manager.create(Product, {
      shop: payload.shop,
      category: payload.category,
      name: payload.name,
      slug: payload.slug,
      base_price: payload.base_price,
      status: 2,
      description: `Sản phẩm seed test: ${payload.name}`,
    });
    product = await manager.save(Product, product);
  }

  if (!product.images?.length) {
    const image = manager.create(ProductImage, {
      product,
      image_url: payload.image_url,
      is_main: true,
    });
    await manager.save(ProductImage, image);
  }

  const variants: ProductVariant[] = [];
  for (const variantPayload of payload.variants) {
    let variant = await manager.findOne(ProductVariant, {
      where: { sku: variantPayload.sku },
      relations: ['product'],
    });

    if (!variant) {
      variant = manager.create(ProductVariant, {
        product,
        sku: variantPayload.sku,
        price: variantPayload.price,
        stock: variantPayload.stock,
      });
      variant = await manager.save(ProductVariant, variant);
    } else if (Number(variant.stock) < variantPayload.stock) {
      variant.stock = variantPayload.stock;
      await manager.save(ProductVariant, variant);
    }

    variants.push(variant);
  }

  return { product, variants };
}

async function ensureCustomerAddress(manager: any, user: User) {
  const existing = await manager.findOne(UserAddress, {
    where: { user_id: user.id, is_default: 1 },
  });
  if (existing) {
    return existing;
  }

  const address = manager.create(UserAddress, {
    user_id: user.id,
    receiver_name: user.full_name ?? 'Khach Hang Test',
    receiver_phone: '0912345678',
    province: 'Hà Nội',
    district: 'Nam Từ Liêm',
    ward: 'Mỹ Đình 2',
    detail_address: 'Số 1, đường Test OpenMarket',
    is_default: 1,
  });

  return manager.save(UserAddress, address);
}

async function seedCart(manager: any, user: User, variants: ProductVariant[]) {
  let cart = await manager.findOne(Cart, { where: { user: { id: user.id } } });
  if (!cart) {
    cart = manager.create(Cart, { user: { id: user.id } as any });
    cart = await manager.save(Cart, cart);
  }

  await manager.delete(CartItem, { cart_id: cart.id });

  const items = [
    manager.create(CartItem, {
      cart_id: cart.id,
      variant_id: variants[0].id,
      quantity: 1,
    }),
    manager.create(CartItem, {
      cart_id: cart.id,
      variant_id: variants[1].id,
      quantity: 2,
    }),
  ];

  await manager.save(CartItem, items);
}

async function seedOrderHistory(
  manager: any,
  customer: User,
  shopA: Shop,
  shopB: Shop,
  variantA: ProductVariant,
  variantB: ProductVariant,
  variantC: ProductVariant,
  variantD: ProductVariant,
) {
  const existingCount = await manager.count(Order, {
    where: { user: { id: customer.id } },
  });
  if (existingCount > 0) {
    return;
  }

  const createOrderWithOneShop = async (payload: {
    variant: ProductVariant;
    shop: Shop;
    quantity: number;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
  }) => {
    if (Number(payload.variant.stock) < payload.quantity) {
      payload.variant.stock = payload.quantity + 20;
      await manager.save(ProductVariant, payload.variant);
    }

    const subtotal = Number(payload.variant.price) * payload.quantity;
    const order = await manager.save(
      Order,
      manager.create(Order, {
        user: customer,
        total_amount: subtotal,
        status: payload.orderStatus,
        payment_method: payload.paymentMethod,
      }),
    );

    const orderShop = await manager.save(
      OrderShop,
      manager.create(OrderShop, {
        order,
        shop: payload.shop,
        subtotal,
        status: payload.orderStatus,
      }),
    );

    await manager.save(
      OrderItem,
      manager.create(OrderItem, {
        orderShop,
        variant: payload.variant,
        quantity: payload.quantity,
        price: payload.variant.price,
        subtotal,
      }),
    );

    await manager.save(
      Payment,
      manager.create(Payment, {
        order,
        provider: payload.paymentMethod,
        status: payload.paymentStatus,
        paid_at:
          payload.paymentStatus === PaymentStatus.PAID ? new Date() : null,
      }),
    );

    payload.variant.stock = Number(payload.variant.stock) - payload.quantity;
    await manager.save(ProductVariant, payload.variant);
  };

  await createOrderWithOneShop({
    variant: variantA,
    shop: shopA,
    quantity: 1,
    orderStatus: OrderStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'COD',
  });

  await createOrderWithOneShop({
    variant: variantB,
    shop: shopB,
    quantity: 1,
    orderStatus: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: 'VNPAY',
  });

  await createOrderWithOneShop({
    variant: variantC,
    shop: shopA,
    quantity: 2,
    orderStatus: OrderStatus.SHIPPING,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'MOMO',
  });

  await createOrderWithOneShop({
    variant: variantD,
    shop: shopB,
    quantity: 1,
    orderStatus: OrderStatus.CANCELLED,
    paymentStatus: PaymentStatus.FAILED,
    paymentMethod: 'VNPAY',
  });
}

async function seedOrderFlow() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const roleAdmin = await ensureRole(queryRunner.manager, {
      id: 1,
      code: 'ADMIN',
      name: 'Administrator',
    });
    const roleShopOwner = await ensureRole(queryRunner.manager, {
      id: 2,
      code: 'SHOP_OWNER',
      name: 'Shop Owner',
    });
    const roleUser = await ensureRole(queryRunner.manager, {
      id: 3,
      code: 'USER',
      name: 'Customer',
    });

    await ensureUser(queryRunner.manager, {
      email: 'admin@example.com',
      full_name: 'System Admin',
      role: roleAdmin,
      status: 1,
      avatar_url: '/uploads/seed-avatar-admin.png',
    });

    const shopOwnerA = await ensureUser(queryRunner.manager, {
      email: 'shop@example.com',
      full_name: 'Shop Owner A',
      role: roleShopOwner,
      status: 1,
      avatar_url: '/uploads/seed-avatar-seller-a.png',
    });

    const shopOwnerB = await ensureUser(queryRunner.manager, {
      email: 'shop2@example.com',
      full_name: 'Shop Owner B',
      role: roleShopOwner,
      status: 1,
      avatar_url: '/uploads/seed-avatar-seller-b.png',
    });

    const customer = await ensureUser(queryRunner.manager, {
      email: 'user@example.com',
      full_name: 'Lucky Customer',
      role: roleUser,
      status: 1,
      avatar_url: '/uploads/seed-avatar-user.png',
    });

    const shopA = await ensureShop(queryRunner.manager, {
      owner: shopOwnerA,
      name: 'Tech Haven',
      slug: 'tech-haven',
      description: 'Shop test cong nghe',
      address: '123 Tech Street',
      status: 1,
      logo_url: '/uploads/seed-shop-logo-a.png',
    });

    const shopB = await ensureShop(queryRunner.manager, {
      owner: shopOwnerB,
      name: 'Fashion Hub',
      slug: 'fashion-hub',
      description: 'Shop test thoi trang',
      address: '456 Fashion Avenue',
      status: 1,
      logo_url: '/uploads/seed-shop-logo-b.png',
    });

    const categoryElectronics = await ensureCategory(queryRunner.manager, {
      name: 'Electronics',
      slug: 'electronics',
    });

    const categoryFashion = await ensureCategory(queryRunner.manager, {
      name: 'Fashion',
      slug: 'fashion',
    });

    const categoryHome = await ensureCategory(queryRunner.manager, {
      name: 'Home & Living',
      slug: 'home-living',
    });

    const seededA = await ensureProductWithVariants(queryRunner.manager, {
      shop: shopA,
      category: categoryElectronics,
      name: 'Gaming Mouse X2',
      slug: 'gaming-mouse-x2',
      base_price: 690000,
      image_url: '/uploads/seed-product-mouse.png',
      variants: [
        { sku: 'GMX2-BLACK', price: 690000, stock: 50 },
        { sku: 'GMX2-WHITE', price: 720000, stock: 40 },
      ],
    });

    const seededB = await ensureProductWithVariants(queryRunner.manager, {
      shop: shopB,
      category: categoryFashion,
      name: 'Backpack Urban Pro',
      slug: 'backpack-urban-pro',
      base_price: 490000,
      image_url: '/uploads/seed-product-backpack.png',
      variants: [
        { sku: 'BUP-BLACK', price: 490000, stock: 60 },
        { sku: 'BUP-GREY', price: 510000, stock: 45 },
      ],
    });

    const seededC = await ensureProductWithVariants(queryRunner.manager, {
      shop: shopA,
      category: categoryElectronics,
      name: 'Mechanical Keyboard K87',
      slug: 'mechanical-keyboard-k87',
      base_price: 1290000,
      image_url: '/uploads/seed-product-keyboard.png',
      variants: [
        { sku: 'KBK87-BLACK', price: 1290000, stock: 35 },
        { sku: 'KBK87-WHITE', price: 1350000, stock: 30 },
      ],
    });

    const seededD = await ensureProductWithVariants(queryRunner.manager, {
      shop: shopB,
      category: categoryHome,
      name: 'Desk Lamp Minimal',
      slug: 'desk-lamp-minimal',
      base_price: 390000,
      image_url: '/uploads/seed-product-lamp.png',
      variants: [
        { sku: 'DLM-WARM', price: 390000, stock: 55 },
        { sku: 'DLM-WHITE', price: 410000, stock: 48 },
      ],
    });

    await ensureProductWithVariants(queryRunner.manager, {
      shop: shopA,
      category: categoryHome,
      name: 'Air Purifier Mini',
      slug: 'air-purifier-mini',
      base_price: 1790000,
      image_url: '/uploads/seed-product-purifier.png',
      variants: [
        { sku: 'APM-STANDARD', price: 1790000, stock: 28 },
        { sku: 'APM-PRO', price: 2090000, stock: 22 },
      ],
    });

    await ensureProductWithVariants(queryRunner.manager, {
      shop: shopB,
      category: categoryFashion,
      name: 'Sneaker Street V2',
      slug: 'sneaker-street-v2',
      base_price: 990000,
      image_url: '/uploads/seed-product-sneaker.png',
      variants: [
        { sku: 'SSV2-42', price: 990000, stock: 40 },
        { sku: 'SSV2-43', price: 990000, stock: 42 },
      ],
    });

    await ensureCustomerAddress(queryRunner.manager, customer);

    await seedCart(queryRunner.manager, customer, [
      seededA.variants[0],
      seededB.variants[0],
    ]);

    await seedOrderHistory(
      queryRunner.manager,
      customer,
      shopA,
      shopB,
      seededA.variants[1],
      seededB.variants[1],
      seededC.variants[0],
      seededD.variants[0],
    );

    await queryRunner.commitTransaction();
    console.log('Seed order flow completed successfully.');
    console.log('Test accounts:');
    console.log(' - admin@example.com / 123456');
    console.log(' - shop@example.com / 123456');
    console.log(' - shop2@example.com / 123456');
    console.log(' - user@example.com / 123456');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Seed order flow failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

void seedOrderFlow();
