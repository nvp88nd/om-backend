import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import request from 'supertest';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
};

async function login(
  server: any,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await request(server)
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body as LoginResponse;
}

async function verifyOrderFlow() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const server = app.getHttpServer();

  const resultLines: string[] = [];

  try {
    const userLogin = await login(server, 'user@example.com', '123456');
    const userToken = userLogin.accessToken;
    resultLines.push(`Login user: OK (${userLogin.user.email})`);

    const cartResponse = await request(server)
      .get('/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const cart = cartResponse.body;
    const cartItems: Array<{
      variant_id: string;
      quantity: number;
      stock: number;
      product_name: string;
    }> = cart.items ?? [];
    if (!cartItems.length) {
      throw new Error('Cart is empty, cannot verify checkout flow');
    }
    resultLines.push(`Cart items: ${cartItems.length}`);

    const addressesResponse = await request(server)
      .get('/user/addresses')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const addresses = addressesResponse.body as Array<{ id: string }>;
    if (!addresses.length) {
      throw new Error('No address found for test user');
    }
    const shippingAddressId = addresses[0].id;
    resultLines.push(`Address: OK (${shippingAddressId})`);

    const selectedItem = cartItems[0];
    const checkoutResponse = await request(server)
      .post('/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [
          {
            variant_id: selectedItem.variant_id,
            quantity: 1,
          },
        ],
        payment_method: 'COD',
        shipping_address_id: shippingAddressId,
      })
      .expect(201);

    const createdOrder = checkoutResponse.body as {
      id: string;
      status: string;
      items: Array<{ variant_id: string }>;
    };
    if (!createdOrder.id) {
      throw new Error('Create order did not return order id');
    }
    resultLines.push(`Create order: OK (${createdOrder.id})`);

    const userOrdersResponse = await request(server)
      .get('/orders/my-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const userOrders = userOrdersResponse.body as Array<{ id: string }>;
    const createdOrderExists = userOrders.some((order) => order.id === createdOrder.id);
    if (!createdOrderExists) {
      throw new Error('Created order not found in /orders/my-orders');
    }
    resultLines.push('User order history: OK');

    const cartAfterCheckoutResponse = await request(server)
      .get('/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const cartAfterCheckout = cartAfterCheckoutResponse.body as {
      items: Array<{ variant_id: string }>;
    };
    const purchasedVariantStillInCart = (cartAfterCheckout.items ?? []).some(
      (item) => item.variant_id === selectedItem.variant_id,
    );
    if (purchasedVariantStillInCart) {
      throw new Error('Purchased variant still exists in cart after checkout');
    }
    resultLines.push('Cart cleanup after checkout: OK');

    const sellerAccounts = ['shop@example.com', 'shop2@example.com'];
    let sellerEmailUsed = '';
    let sellerTokenUsed = '';
    let targetShopOrderId = '';

    for (const sellerEmail of sellerAccounts) {
      const shopLogin = await login(server, sellerEmail, '123456');
      const shopToken = shopLogin.accessToken;
      resultLines.push(`Login shop: OK (${shopLogin.user.email})`);

      const shopOrdersResponse = await request(server)
        .get('/orders/shop-orders')
        .set('Authorization', `Bearer ${shopToken}`)
        .expect(200);
      const shopOrders = shopOrdersResponse.body as Array<{
        id: string;
        order: { id: string };
        status: number;
      }>;

      const found = shopOrders.find((orderShop) => orderShop.order?.id === createdOrder.id);
      if (found) {
        sellerEmailUsed = sellerEmail;
        sellerTokenUsed = shopToken;
        targetShopOrderId = found.id;
        break;
      }
    }

    if (!targetShopOrderId || !sellerTokenUsed) {
      throw new Error('Created order is not visible in /orders/shop-orders for all seeded sellers');
    }

    resultLines.push(
      `Shop order visibility: OK (${targetShopOrderId}, seller=${sellerEmailUsed})`,
    );

    await request(server)
      .patch(`/orders/shop-orders/${targetShopOrderId}/status`)
      .set('Authorization', `Bearer ${sellerTokenUsed}`)
      .send({ status: 'SHIPPING' })
      .expect(200);
    resultLines.push('Shop update status SHIPPING: OK');

    const userOrdersAfterStatusResponse = await request(server)
      .get('/orders/my-orders')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const userOrdersAfterStatus = userOrdersAfterStatusResponse.body as Array<{
      id: string;
      status: string;
    }>;
    const updatedOrder = userOrdersAfterStatus.find(
      (order) => order.id === createdOrder.id,
    );
    if (!updatedOrder) {
      throw new Error('Cannot find updated order in user order history');
    }
    if (updatedOrder.status !== 'SHIPPED') {
      throw new Error(
        `Expected updated order status to be SHIPPED, received ${updatedOrder.status}`,
      );
    }
    resultLines.push(`User sees updated status: OK (${updatedOrder.status})`);

    console.log('ORDER_FLOW_TEST: PASS');
    for (const line of resultLines) {
      console.log(`- ${line}`);
    }
  } finally {
    await app.close();
  }
}

void verifyOrderFlow().catch((error) => {
  console.error('ORDER_FLOW_TEST: FAIL');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
