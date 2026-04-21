import { AppDataSource } from './data-source';
import { Role } from '../modules/auth/entities/role.entity';
import { User } from '../modules/auth/entities/user.entity';
import { Shop } from '../modules/shop/entities/shop.entity';
import { ShopWallet } from '../modules/shop/entities/shop-wallet.entity';
import { Category } from '../modules/product/entities/category.entity';
import { Attribute } from '../modules/product/entities/attribute.entity';
import { AttributeValue } from '../modules/product/entities/attribute-value.entity';
import { Product } from '../modules/product/entities/product.entity';
import { ProductVariant } from '../modules/product/entities/product-variant.entity';
import { ProductImage } from '../modules/product/entities/product-image.entity';
import { VariantAttribute } from '../modules/product/entities/variant-attribute.entity';
import { Permission } from '../modules/permission/entities/permission.entity';
import { RolePermission } from '../modules/permission/entities/role-permission.entity';
import { Banner } from '../modules/content_system/entities/banner.entity';
import { Review } from '../modules/review/entities/review.entity';
import { Promotion } from '../modules/promotion/entities/promotion.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  console.log('Data Source has been initialized!');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Seed Roles
    console.log('Seeding roles...');
    const rolesData = [
      { id: 1, code: 'ADMIN', name: 'Administrator' },
      { id: 2, code: 'SHOP_OWNER', name: 'Shop Owner' },
      { id: 3, code: 'USER', name: 'Customer' },
      { id: 4, code: 'SUPER_ADMIN', name: 'Super Administrator' },
    ];
    const roles: Role[] = [];
    for (const r of rolesData) {
      roles.push(await queryRunner.manager.save(Role, r));
    }

    // 1.1 Seed Permissions
    console.log('Seeding permissions...');
    const permissions = [
      { id: 1001, code: 'USER_VIEW', description: 'View user list' },
      { id: 1002, code: 'USER_EDIT', description: 'Edit user information' },
      { id: 1003, code: 'USER_DELETE', description: 'Delete or lock user' },
      { id: 2001, code: 'SHOP_VIEW', description: 'View shop list' },
      { id: 2002, code: 'SHOP_APPROVE', description: 'Approve or reject shop' },
      { id: 2003, code: 'SHOP_LOCK', description: 'Lock or unlock shop' },
      { id: 3001, code: 'PRODUCT_VIEW', description: 'View product list' },
      { id: 3002, code: 'PRODUCT_APPROVE', description: 'Approve or reject product' },
      { id: 3003, code: 'PRODUCT_DELETE', description: 'Delete product' },
      { id: 4001, code: 'ORDER_VIEW', description: 'View order list' },
      { id: 4002, code: 'ORDER_MANAGE', description: 'Manage order status' },
      { id: 5001, code: 'COMPLAINT_VIEW', description: 'View complaints' },
      { id: 5002, code: 'COMPLAINT_PROCESS', description: 'Process complaints' },
      { id: 6001, code: 'FINANCE_VIEW', description: 'View finance reports' },
      { id: 6002, code: 'WITHDRAWAL_PROCESS', description: 'Process withdrawals' },
      { id: 7001, code: 'CONTENT_MANAGE', description: 'Manage banners and keywords' },
    ];

    for (const p of permissions) {
      await queryRunner.manager.save(Permission, p);
    }

    for (const p of permissions) {
      await queryRunner.manager.save(RolePermission, { role_id: 1, permission_id: p.id });
      await queryRunner.manager.save(RolePermission, { role_id: 4, permission_id: p.id });
    }

    // 2. Seed Users
    console.log('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    const usersData = [
      { email: 'admin@example.com', full_name: 'System Admin', role: roles[0], avatar: '/uploads/seed-avatar-admin.png' },
      { email: 'shop@example.com', full_name: 'Tech Master', role: roles[1], avatar: '/uploads/seed-avatar-seller-a.png' },
      { email: 'shop2@example.com', full_name: 'Fashion Icon', role: roles[1], avatar: '/uploads/seed-avatar-seller-b.png' },
      { email: 'user@example.com', full_name: 'John Doe', role: roles[2], avatar: '/uploads/seed-avatar-user.png' },
      { email: 'user2@example.com', full_name: 'Jane Smith', role: roles[2], avatar: '/uploads/seed-avatar-user.png' },
    ];

    const users: User[] = [];
    for (const u of usersData) {
      const user = queryRunner.manager.create(User, {
        email: u.email,
        password_hash: passwordHash,
        full_name: u.full_name,
        status: 1,
        role: u.role,
        avatar_url: u.avatar,
      });
      users.push(await queryRunner.manager.save(User, user));
    }

    // 3. Seed Shops
    console.log('Seeding shops...');
    const shopsData = [
      { owner: users[1], name: 'Tech Haven Official', slug: 'tech-haven', description: 'Best gadgets in town', logo: '/uploads/seed-shop-logo-a.png' },
      { owner: users[2], name: 'Fashion Hub', slug: 'fashion-hub', description: 'Latest trends and styles', logo: '/uploads/seed-shop-logo-b.png' },
    ];

    const shops: Shop[] = [];
    for (const s of shopsData) {
      const shop = queryRunner.manager.create(Shop, {
        ...s,
        status: 1,
        address: 'Ho Chi Minh City, Vietnam',
        logo_url: s.logo,
      });
      const savedShop = await queryRunner.manager.save(Shop, shop);
      shops.push(savedShop);

      await queryRunner.manager.save(ShopWallet, { shop_id: savedShop.id, balance: 5000000 });
    }

    // 4. Seed Categories
    console.log('Seeding categories...');
    const categoriesData = [
      { name: 'Điện tử', slug: 'electronics', image: '/uploads/cat-electronics.png' },
      { name: 'Thời trang', slug: 'fashion', image: '/uploads/cat-fashion.png' },
      { name: 'Nhà cửa', slug: 'home-living', image: '/uploads/cat-home.png' },
      { name: 'Làm đẹp', slug: 'beauty', image: '/uploads/cat-beauty.png' },
      { name: 'Thể thao', slug: 'sports', image: '/uploads/cat-sports.png' },
      { name: 'Sách', slug: 'books', image: '/uploads/cat-books.png' },
    ];

    const categories: Category[] = [];
    for (const c of categoriesData) {
      const cat = queryRunner.manager.create(Category, c);
      categories.push(await queryRunner.manager.save(cat));
    }

    // 5. Seed Products
    console.log('Seeding products...');
    const productsToCreate = [
      { shop: shops[0], category: categories[0], name: 'iPhone 15 Pro Max', price: 34990000, slug: 'iphone-15-pro-max' },
      { shop: shops[0], category: categories[0], name: 'MacBook Air M2', price: 28500000, slug: 'macbook-air-m2' },
      { shop: shops[0], category: categories[0], name: 'Sony WH-1000XM5', price: 8490000, slug: 'sony-wh-1000xm5' },
      { shop: shops[1], category: categories[1], name: 'Áo thun Nam Basic', price: 250000, slug: 'ao-thun-nam-basic' },
      { shop: shops[1], category: categories[1], name: 'Quần Jeans Slim Fit', price: 450000, slug: 'quan-jeans-slim-fit' },
      { shop: shops[1], category: categories[1], name: 'Váy dạo phố nữ', price: 380000, slug: 'vay-dao-pho-nu' },
      { shop: shops[0], category: categories[2], name: 'Đèn bàn thông minh', price: 750000, slug: 'den-ban-thong-minh' },
      { shop: shops[1], category: categories[3], name: 'Son môi Matte', price: 290000, slug: 'son-moi-matte' },
      { shop: shops[1], category: categories[4], name: 'Giày chạy bộ Pro', price: 1250000, slug: 'giay-chay-bo-pro' },
      { shop: shops[0], category: categories[5], name: 'Sách Đắc Nhân Tâm', price: 120000, slug: 'sach-dac-nhan-tam' },
    ];

    for (const p of productsToCreate) {
      const product = queryRunner.manager.create(Product, {
        shop: p.shop,
        category: p.category,
        name: p.name,
        slug: p.slug,
        base_price: p.price,
        status: 2, // Approved
        description: `Mô tả chi tiết cho sản phẩm ${p.name}. Đây là một sản phẩm chất lượng cao từ ${p.shop.name}.`,
      });
      const savedProduct = await queryRunner.manager.save(product);

      await queryRunner.manager.save(ProductImage, {
        product: savedProduct,
        image_url: `/uploads/seed-product.png`,
        is_main: true,
      });

      const variant = queryRunner.manager.create(ProductVariant, {
        product: savedProduct,
        sku: `${savedProduct.slug.toUpperCase()}-001`,
        price: p.price,
        stock: 100,
      });
      await queryRunner.manager.save(variant);

      // Add a review
      await queryRunner.manager.save(Review, {
        product: savedProduct,
        user: users[3],
        rating: 5,
        comment: `Sản phẩm ${p.name} rất tuyệt vời!`,
      });
    }

    // 6. Seed Banners
    console.log('Seeding banners...');
    const bannersData = [
      { image_url: '/uploads/banner-hero.png', position: 'HERO', status: 1, link: '/products' },
      { image_url: '/uploads/banner-ad.png', position: 'SIDEBAR', status: 1, link: '/categories' },
    ];
    for (const b of bannersData) {
      await queryRunner.manager.save(Banner, b);
    }

    // 7. Seed Promotions
    console.log('Seeding promotions...');
    await queryRunner.manager.save(Promotion, {
      name: 'Giảm giá mùa hè',
      code: 'SUMMER2026',
      type: 1, // Toàn sàn
      discount_type: 1, // %
      discount_value: 15,
      min_order_value: 500000,
      max_discount_value: 100000,
      start_at: new Date(),
      end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_active: 1,
    });

    await queryRunner.commitTransaction();
    console.log('Advanced seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
}

seed();
