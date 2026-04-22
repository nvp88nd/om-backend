import { AppDataSource } from './data-source';
import { User } from '../modules/auth/entities/user.entity';
import { Shop } from '../modules/shop/entities/shop.entity';
import { ShopWallet } from '../modules/shop/entities/shop-wallet.entity';
import { Product } from '../modules/product/entities/product.entity';
import { ProductVariant } from '../modules/product/entities/product-variant.entity';
import { Order } from '../modules/order/entities/order.entity';
import { OrderShop } from '../modules/order/entities/order-shop.entity';
import { OrderItem } from '../modules/order/entities/order-item.entity';
import { Notification } from '../modules/notification/entities/notification.entity';
import { Complaint } from '../modules/complaint_violation/entities/complaint.entity';
import { Withdrawal } from '../modules/order/entities/withdrawal.entity';

async function seed() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  console.log('Data Source has been initialized!');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Get existing data
    const customers = await queryRunner.manager.find(User, { 
      where: { role: { code: 'USER' } } 
    });
    const shops = await queryRunner.manager.find(Shop, { relations: ['owner'] });
    const products = await queryRunner.manager.find(Product, { relations: ['variants', 'shop'] });

    if (customers.length === 0 || shops.length === 0 || products.length === 0) {
      throw new Error('Please run seed-rich-data.ts first to have users, shops and products!');
    }

    // 2. Seed Orders (100 orders distributed randomly)
    console.log('Seeding 100+ orders...');
    const orderStatuses = [0, 1, 2, 3, 4, 5]; // 0: Pending, 1: Processing, 2: Shipped, 3: Delivered, 4: Cancelled, 5: Returned (Dựa trên kiến trúc thường gặp)
    
    for (let i = 0; i < 120; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const randomShops = shops.sort(() => 0.5 - Math.random()).slice(0, 1 + Math.floor(Math.random() * 2)); // 1-2 shops per order

      let orderTotal = 0;
      const order = queryRunner.manager.create(Order, {
        user: customer,
        total_amount: 0,
        status: 1, // Default status for root order
        payment_method: Math.random() > 0.5 ? 'COD' : 'VNPAY',
        shipping_receiver_name: customer.full_name,
        shipping_receiver_phone: '09' + Math.floor(10000000 + Math.random() * 89999999),
        shipping_province: 'TP. Hồ Chí Minh',
        shipping_district: 'Quận 1',
        shipping_ward: 'Phường Bến Nghé',
        shipping_detail_address: 'Số ' + (i + 1) + ' đường Lê Lợi',
        created_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random time in last 30 days
      });
      const savedOrder = await queryRunner.manager.save(order);

      for (const shop of randomShops) {
        const shopProducts = products.filter(p => p.shop.id === shop.id);
        if (shopProducts.length === 0) continue;

        const randomProducts = shopProducts.slice(0, 1 + Math.floor(Math.random() * 2));
        let shopSubtotal = 0;

        const orderShop = queryRunner.manager.create(OrderShop, {
          order: savedOrder,
          shop: shop,
          subtotal: 0,
          status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
          shipping_fee: 30000,
        });
        const savedOrderShop = await queryRunner.manager.save(orderShop);

        for (const prod of randomProducts) {
          const variant = prod.variants[0];
          const qty = 1 + Math.floor(Math.random() * 3);
          const itemPrice = Number(variant.price);
          const itemSubtotal = itemPrice * qty;

          await queryRunner.manager.save(OrderItem, {
            orderShop: savedOrderShop,
            variant: variant,
            quantity: qty,
            price: itemPrice,
            subtotal: itemSubtotal,
          });
          shopSubtotal += itemSubtotal;
        }

        savedOrderShop.subtotal = shopSubtotal;
        await queryRunner.manager.save(OrderShop, savedOrderShop);
        orderTotal += (shopSubtotal + 30000);

        // If status is Delivered (3), update shop wallet and notify
        if (savedOrderShop.status === 3) {
            const wallet = await queryRunner.manager.findOne(ShopWallet, { where: { shop_id: shop.id } });
            if (wallet) {
                wallet.balance = Number(wallet.balance) + shopSubtotal;
                await queryRunner.manager.save(ShopWallet, wallet);
            }
        }

        // Notify shop owner about new order if status is Pending (0) or Processing (1)
        if (savedOrderShop.status <= 1) {
            await queryRunner.manager.save(Notification, {
                user: shop.owner,
                title: 'Đơn hàng mới!',
                content: `Shop của bạn có đơn hàng mới từ ${customer.full_name}.`,
                type: 1, // 1 for ORDER
                is_read: 0, // 0 for false
            });
        }
      }

      savedOrder.total_amount = orderTotal;
      await queryRunner.manager.save(Order, savedOrder);
    }

    // 3. Seed Withdrawals for Admin to approve
    console.log('Seeding withdrawals...');
    for (const shop of shops.slice(0, 5)) {
        await queryRunner.manager.save(Withdrawal, {
            shop_id: shop.id,
            amount: 1000000 + Math.floor(Math.random() * 4000000),
            status: 0, // Pending
            bank_name: 'Vietcombank',
            bank_account_number: '1234567890',
            bank_account_name: shop.name.toUpperCase(),
        });
    }

    // 4. Seed Complaints for Admin to process
    console.log('Seeding complaints...');
    const complaintReasons = [
        'Sản phẩm không đúng mô tả',
        'Hàng giả/hàng nhái',
        'Shop có thái độ phục vụ kém',
        'Giao thiếu hàng',
        'Sản phẩm bị vỡ hỏng khi nhận'
    ];
    for (let i = 0; i < 10; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        await queryRunner.manager.save(Complaint, {
            user_id: customer.id,
            target_id: product.id,
            target_type: 'PRODUCT',
            reason: complaintReasons[Math.floor(Math.random() * complaintReasons.length)],
            description: 'Tôi rất không hài lòng với sản phẩm này, yêu cầu hỗ trợ.',
            status: 0, // Pending
        });
    }

    // 5. Seed extra shop pending approval
    console.log('Seeding shops pending approval...');
    const pendingShops = ['Gốm Sứ Bát Tràng', 'Đặc Sản Tây Bắc', 'Thời Trang Trẻ Em'];
    const adminUser = await queryRunner.manager.findOne(User, { where: { role: { code: 'ADMIN' } } });
    
    for (const name of pendingShops) {
        const owner = queryRunner.manager.create(User, {
            email: name.toLowerCase().replace(/ /g, '') + '@pending.vn',
            password_hash: '$2b$10$e9RUp67S.0M/v433f.9.q.G0.B6yFk33I3i7qSgXyK3U7M9K6qG2O', // 123456
            full_name: 'Chủ shop ' + name,
            status: 1,
            role: { id: 2 } as any,
        });
        const savedOwner = await queryRunner.manager.save(User, owner);

        await queryRunner.manager.save(Shop, {
            owner: savedOwner,
            name: name,
            slug: name.toLowerCase().replace(/ /g, '-'),
            description: 'Shop mới đăng ký chờ duyệt.',
            status: 0, // Pending approval
            address: 'Hà Nội, Việt Nam',
        });
    }

    await queryRunner.commitTransaction();
    console.log('Operational data seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
}

seed();
