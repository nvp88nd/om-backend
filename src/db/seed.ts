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
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  console.log('Data Source has been initialized!');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Seed Roles
    console.log('Seeding roles...');
    const roles = [
      { id: 1, code: 'ADMIN', name: 'Administrator' },
      { id: 2, code: 'SHOP_OWNER', name: 'Shop Owner' },
      { id: 3, code: 'USER', name: 'Customer' },
    ];
    for (const r of roles) {
      await queryRunner.manager.save(Role, r);
    }

    // 2. Seed Users
    console.log('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    const adminUser = queryRunner.manager.create(User, {
      email: 'admin@example.com',
      password_hash: passwordHash,
      full_name: 'System Admin',
      status: 1,
      role: { id: 1 } as any,
    });
    await queryRunner.manager.save(adminUser);

    const shopOwnerUser = queryRunner.manager.create(User, {
      email: 'shop@example.com',
      password_hash: passwordHash,
      full_name: 'John Shop',
      status: 1,
      role: { id: 2 } as any,
    });
    await queryRunner.manager.save(shopOwnerUser);

    const customerUser = queryRunner.manager.create(User, {
      email: 'user@example.com',
      password_hash: passwordHash,
      full_name: 'Lucky Customer',
      status: 1,
      role: { id: 3 } as any,
    });
    await queryRunner.manager.save(customerUser);

    // 3. Seed Shop
    console.log('Seeding shop...');
    const testShop = queryRunner.manager.create(Shop, {
      owner: shopOwnerUser,
      name: 'Tech Haven',
      slug: 'tech-haven',
      description: 'The best place for gadgets',
      status: 1, // Active
      address: '123 Tech Street, Silicon Valley',
    });
    await queryRunner.manager.save(testShop);

    const wallet = queryRunner.manager.create(ShopWallet, {
      shop_id: testShop.id,
      balance: 1000000,
    });
    await queryRunner.manager.save(wallet);

    // 4. Seed Categories
    console.log('Seeding categories...');
    const categories = [
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Fashion', slug: 'fashion' },
      { name: 'Home & Living', slug: 'home-living' },
    ];
    const savedCategories: Category[] = [];
    for (const c of categories) {
      const cat = queryRunner.manager.create(Category, c);
      savedCategories.push(await queryRunner.manager.save(cat));
    }

    // 5. Seed Attributes
    console.log('Seeding attributes...');
    const colorAttr = queryRunner.manager.create(Attribute, { name: 'Color' });
    await queryRunner.manager.save(colorAttr);
    const sizeAttr = queryRunner.manager.create(Attribute, { name: 'Size' });
    await queryRunner.manager.save(sizeAttr);

    const red = queryRunner.manager.create(AttributeValue, { attribute: colorAttr, value: 'Red' });
    const blue = queryRunner.manager.create(AttributeValue, { attribute: colorAttr, value: 'Blue' });
    const small = queryRunner.manager.create(AttributeValue, { attribute: sizeAttr, value: 'S' });
    const large = queryRunner.manager.create(AttributeValue, { attribute: sizeAttr, value: 'L' });
    await queryRunner.manager.save([red, blue, small, large]);

    // 6. Seed Product
    console.log('Seeding product...');
    const product = queryRunner.manager.create(Product, {
      shop: testShop,
      category: savedCategories[0],
      name: 'Gaming Mouse G Pro',
      slug: 'gaming-mouse-g-pro',
      description: 'Ultra fast gaming mouse for pros',
      base_price: 500000,
      status: 2, // Approved
    });
    await queryRunner.manager.save(product);

    const image = queryRunner.manager.create(ProductImage, {
      product,
      image_url: 'https://placehold.co/600x400/png',
      is_main: true,
    });
    await queryRunner.manager.save(image);

    // Variants
    const v1 = queryRunner.manager.create(ProductVariant, {
      product,
      sku: 'GPRO-RED-S',
      price: 550000,
      stock: 50,
    });
    await queryRunner.manager.save(v1);

    await queryRunner.manager.save(VariantAttribute, {
      variant_id: v1.id,
      attribute_value_id: red.id,
    });
    await queryRunner.manager.save(VariantAttribute, {
      variant_id: v1.id,
      attribute_value_id: small.id,
    });

    const v2 = queryRunner.manager.create(ProductVariant, {
      product,
      sku: 'GPRO-BLUE-L',
      price: 600000,
      stock: 30,
    });
    await queryRunner.manager.save(v2);

    await queryRunner.manager.save(VariantAttribute, {
      variant_id: v2.id,
      attribute_value_id: blue.id,
    });
    await queryRunner.manager.save(VariantAttribute, {
      variant_id: v2.id,
      attribute_value_id: large.id,
    });

    await queryRunner.commitTransaction();
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed();
