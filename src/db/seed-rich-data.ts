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
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    // 1. Get or Create Roles
    console.log('Checking roles...');
    let roles = await queryRunner.manager.find(Role);
    if (roles.length === 0) {
      const rolesData = [
        { id: 1, code: 'ADMIN', name: 'Administrator' },
        { id: 2, code: 'SHOP_OWNER', name: 'Shop Owner' },
        { id: 3, code: 'USER', name: 'Customer' },
        { id: 4, code: 'SUPER_ADMIN', name: 'Super Administrator' },
      ];
      for (const r of rolesData) {
        await queryRunner.manager.save(Role, r);
      }
      roles = await queryRunner.manager.find(Role);
    }
    const roleUser = roles.find(r => r.code === 'USER')!;
    const roleShop = roles.find(r => r.code === 'SHOP_OWNER')!;

    // 2. Seed More Users (Customers)
    console.log('Seeding more customers...');
    const customerNames = [
      'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Đức', 
      'Hoàng Thu Thảo', 'Vũ Anh Tuấn', 'Đặng Phương Nam', 'Bùi Tuyết Mai',
      'Ngô Gia Bảo', 'Trịnh Kim Chi'
    ];
    const customers: User[] = [];
    for (let i = 0; i < customerNames.length; i++) {
      const user = queryRunner.manager.create(User, {
        email: `customer${i + 1}@example.com`,
        password_hash: passwordHash,
        full_name: customerNames[i],
        status: 1,
        role: roleUser,
        avatar_url: `/uploads/seed-avatar-user.png`,
      });
      customers.push(await queryRunner.manager.save(User, user));
    }

    // 3. Seed More Shops
    console.log('Seeding more shops...');
    const shopsData = [
      { name: 'Gia Dụng Việt Official', email: 'giadung@shop.vn', desc: 'Chuyên đồ gia dụng thông minh, chất lượng cao.' },
      { name: 'Apple Store VN', email: 'apple@shop.vn', desc: 'Đại lý ủy quyền chính thức của Apple tại Việt Nam.' },
      { name: 'XinhXinh Cosmetics', email: 'xinhxinh@shop.vn', desc: 'Mỹ phẩm chính hãng từ Hàn Quốc và Nhật Bản.' },
      { name: 'Sneaker Head VN', email: 'sneaker@shop.vn', desc: 'Giày sneaker chính hãng, mẫu mã đa dạng.' },
      { name: 'Book Paradise', email: 'book@shop.vn', desc: 'Thiên đường cho những người yêu sách.' },
      { name: 'GenZ Fashion', email: 'genz@shop.vn', desc: 'Thời trang trẻ trung, năng động cho thế hệ mới.' },
      { name: 'Home Decor Pro', email: 'decor@shop.vn', desc: 'Trang trí nội thất hiện đại và sang trọng.' },
      { name: 'Organic Garden', email: 'organic@shop.vn', desc: 'Thực phẩm sạch và đồ uống organic.' },
    ];

    const shops: Shop[] = [];
    for (let i = 0; i < shopsData.length; i++) {
      const shopOwner = queryRunner.manager.create(User, {
        email: shopsData[i].email,
        password_hash: passwordHash,
        full_name: `Chủ shop ${shopsData[i].name}`,
        status: 1,
        role: roleShop,
        avatar_url: `/uploads/seed-avatar-seller.png`,
      });
      const savedOwner = await queryRunner.manager.save(User, shopOwner);

      const shop = queryRunner.manager.create(Shop, {
        owner: savedOwner,
        name: shopsData[i].name,
        slug: shopsData[i].name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        description: shopsData[i].desc,
        status: 1,
        address: 'Hà Nội, Việt Nam',
        logo_url: `/uploads/seed-shop-logo.png`,
      });
      const savedShop = await queryRunner.manager.save(Shop, shop);
      shops.push(savedShop);
      await queryRunner.manager.save(ShopWallet, { shop_id: savedShop.id, balance: 10000000 });
    }

    // 4. Get or Create Categories
    console.log('Checking categories...');
    let categories = await queryRunner.manager.find(Category);
    if (categories.length === 0) {
      const cats = [
        { name: 'Điện tử', slug: 'electronics' },
        { name: 'Thời trang', slug: 'fashion' },
        { name: 'Nhà cửa', slug: 'home-living' },
        { name: 'Làm đẹp', slug: 'beauty' },
        { name: 'Thể thao', slug: 'sports' },
        { name: 'Sách', slug: 'books' },
      ];
      for (const c of cats) {
        await queryRunner.manager.save(Category, c);
      }
      categories = await queryRunner.manager.find(Category);
    }

    // 5. Seed Attributes
    console.log('Seeding attributes...');
    const attrColor = await queryRunner.manager.save(Attribute, { name: 'Màu sắc' });
    const attrSize = await queryRunner.manager.save(Attribute, { name: 'Kích thước' });
    const attrRAM = await queryRunner.manager.save(Attribute, { name: 'RAM' });
    const attrStorage = await queryRunner.manager.save(Attribute, { name: 'Bộ nhớ trong' });

    const colors = ['Trắng', 'Đen', 'Xanh Dương', 'Đỏ', 'Xám', 'Vàng'];
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const rams = ['8GB', '16GB', '32GB'];
    const storages = ['128GB', '256GB', '512GB', '1TB'];

    const colorValues: AttributeValue[] = [];
    for (const c of colors) colorValues.push(await queryRunner.manager.save(AttributeValue, { attribute: attrColor, value: c }));
    const sizeValues: AttributeValue[] = [];
    for (const s of sizes) sizeValues.push(await queryRunner.manager.save(AttributeValue, { attribute: attrSize, value: s }));
    const ramValues: AttributeValue[] = [];
    for (const r of rams) ramValues.push(await queryRunner.manager.save(AttributeValue, { attribute: attrRAM, value: r }));
    const storageValues: AttributeValue[] = [];
    for (const st of storages) storageValues.push(await queryRunner.manager.save(AttributeValue, { attribute: attrStorage, value: st }));

    // 6. Seed Products
    console.log('Seeding products...');
    const productsToSeed = [
      // Shop Apple Store VN
      { shop: shops[1], cat: 'Điện tử', name: 'iPhone 15 Pro', price: 28990000, desc: 'Chip A17 Pro mạnh mẽ, camera 48MP đỉnh cao.', variants: [ { attrs: [colorValues[1], storageValues[1]], price: 28990000 }, { attrs: [colorValues[4], storageValues[2]], price: 32990000 } ] },
      { shop: shops[1], cat: 'Điện tử', name: 'MacBook Air M3', price: 32990000, desc: 'Siêu mỏng, siêu nhẹ, hiệu năng vượt trội với chip M3.', variants: [ { attrs: [colorValues[0], ramValues[1]], price: 32990000 }, { attrs: [colorValues[1], ramValues[2]], price: 38990000 } ] },
      { shop: shops[1], cat: 'Điện tử', name: 'iPad Pro M2', price: 21500000, desc: 'Màn hình Liquid Retina XDR, trải nghiệm không giới hạn.', variants: [ { attrs: [colorValues[1], storageValues[1]], price: 21500000 } ] },
      
      // Shop GenZ Fashion
      { shop: shops[5], cat: 'Thời trang', name: 'Áo Hoodie Oversize', price: 350000, desc: 'Chất nỉ bông dày dặn, form dáng trẻ trung cực chất.', variants: [ { attrs: [colorValues[1], sizeValues[1]], price: 350000 }, { attrs: [colorValues[2], sizeValues[2]], price: 350000 } ] },
      { shop: shops[5], cat: 'Thời trang', name: 'Quần Jean Baggy', price: 420000, desc: 'Vải jean bền màu, phong cách street style.', variants: [ { attrs: [colorValues[2], sizeValues[1]], price: 420000 }, { attrs: [colorValues[2], sizeValues[2]], price: 420000 } ] },
      { shop: shops[5], cat: 'Thời trang', name: 'Áo Thun Local Brand', price: 220000, desc: 'Cotton 100% co giãn 4 chiều, in hình sắc nét.', variants: [ { attrs: [colorValues[0], sizeValues[1]], price: 220000 }, { attrs: [colorValues[1], sizeValues[2]], price: 220000 } ] },

      // Shop Gia Dụng Việt
      { shop: shops[0], cat: 'Nhà cửa', name: 'Nồi chiên không dầu Philips', price: 3450000, desc: 'Công nghệ Rapid Air, giảm 80% dầu mỡ.', variants: [ { attrs: [colorValues[1]], price: 3450000 } ] },
      { shop: shops[0], cat: 'Nhà cửa', name: 'Máy lọc không khí Xiaomi', price: 2850000, desc: 'Hệ thống lọc 3 lớp, loại bỏ bụi mịn PM2.5.', variants: [ { attrs: [colorValues[0]], price: 2850000 } ] },
      { shop: shops[0], cat: 'Nhà cửa', name: 'Máy hút bụi cầm tay', price: 1250000, desc: 'Lực hút cực mạnh, thiết kế gọn nhẹ dễ sử dụng.', variants: [ { attrs: [colorValues[4]], price: 1250000 } ] },

      // Shop XinhXinh Cosmetics
      { shop: shops[2], cat: 'Làm đẹp', name: 'Sữa rửa mặt CeraVe', price: 380000, desc: 'Làm sạch sâu, dịu nhẹ cho mọi loại da.', variants: [ { attrs: [], price: 380000 } ] },
      { shop: shops[2], cat: 'Làm đẹp', name: 'Kem chống nắng La Roche-Posay', price: 450000, desc: 'Bảo vệ da tối ưu dưới ánh nắng mặt trời.', variants: [ { attrs: [], price: 450000 } ] },
      { shop: shops[2], cat: 'Làm đẹp', name: 'Tẩy trang Bioderma', price: 320000, desc: 'Công nghệ Micellar lừng danh, sạch bong bụi bẩn.', variants: [ { attrs: [], price: 320000 } ] },

      // Shop Book Paradise
      { shop: shops[4], cat: 'Sách', name: 'Nhà Giả Kim', price: 85000, desc: 'Cuốn sách bán chạy nhất mọi thời đại về việc theo đuổi ước mơ.', variants: [ { attrs: [], price: 85000 } ] },
      { shop: shops[4], cat: 'Sách', name: 'Atomic Habits', price: 150000, desc: 'Thay đổi tí hon, kết quả bất ngờ. Chiến lược xây dựng thói quen tốt.', variants: [ { attrs: [], price: 150000 } ] },
      { shop: shops[4], cat: 'Sách', name: 'Sapiens: Lược Sử Loài Người', price: 210000, desc: 'Cái nhìn sâu sắc về lịch sử và tương lai của nhân loại.', variants: [ { attrs: [], price: 210000 } ] },
    ];

    const comments = [
      'Sản phẩm rất tốt, giao hàng nhanh!',
      'Chất lượng tuyệt vời, đúng như mô tả.',
      'Gói hàng cẩn thận, nhân viên nhiệt tình.',
      'Giá cả hợp lý, đáng đồng tiền bát gạo.',
      'Dùng rất thích, sẽ ủng hộ shop lâu dài.',
      'Màu sắc đẹp, chất liệu cao cấp.',
      'Hàng chính hãng, check được mã vạch.',
      'Mới dùng thấy ổn, hy vọng bền.',
      'Ship nhanh như chớp, mới đặt hôm qua nay đã có.',
      'Shop phục vụ rất tốt, 5 sao!'
    ];

    for (const pInfo of productsToSeed) {
      const cat = categories.find(c => c.name === pInfo.cat)!;
      const product = queryRunner.manager.create(Product, {
        shop: pInfo.shop,
        category: cat,
        name: pInfo.name,
        slug: pInfo.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.floor(Math.random() * 1000),
        base_price: pInfo.price,
        description: pInfo.desc,
        status: 2, // Approved
      });
      const savedProduct = await queryRunner.manager.save(product);

      await queryRunner.manager.save(ProductImage, {
        product: savedProduct,
        image_url: `/uploads/seed-product.png`,
        is_main: true,
      });

      for (let i = 0; i < pInfo.variants.length; i++) {
        const vInfo = pInfo.variants[i];
        const variant = queryRunner.manager.create(ProductVariant, {
          product: savedProduct,
          sku: `${savedProduct.slug.toUpperCase()}-V${i}`,
          price: vInfo.price,
          stock: 50 + Math.floor(Math.random() * 100),
        });
        const savedVariant = await queryRunner.manager.save(variant);

        for (const attrVal of vInfo.attrs) {
          await queryRunner.manager.save(VariantAttribute, {
            variant_id: savedVariant.id,
            attribute_value_id: attrVal.id
          });
        }
      }

      // Add 3-7 reviews per product
      const reviewCount = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < reviewCount; j++) {
        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        await queryRunner.manager.save(Review, {
          product: savedProduct,
          user: randomCustomer,
          rating: 4 + Math.floor(Math.random() * 2), // 4 or 5 stars
          comment: comments[Math.floor(Math.random() * comments.length)],
        });
      }
    }

    // 7. Seed Promotions
    console.log('Seeding promotions...');
    // Platform-wide
    await queryRunner.manager.save(Promotion, {
      name: 'Siêu Sale 4.4',
      code: 'OPENMARKET44',
      type: 1, // Toàn sàn
      discount_type: 1, // %
      discount_value: 10,
      min_order_value: 200000,
      max_discount_value: 50000,
      start_at: new Date(),
      end_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      is_active: 1,
    });

    // Shop-specific for Apple Store
    await queryRunner.manager.save(Promotion, {
      name: 'Apple Festival',
      code: 'APPLE500',
      type: 2, // Shop
      shop_id: shops[1].id,
      discount_type: 2, // Fixed
      discount_value: 500000,
      min_order_value: 10000000,
      max_discount_value: 500000,
      start_at: new Date(),
      end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_active: 1,
    });

    await queryRunner.commitTransaction();
    console.log('Rich data seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
}

seed();
