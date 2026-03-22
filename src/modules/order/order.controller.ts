import { Controller, Get, Post, Body, Patch, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrderStatus } from './order.constants';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(userId, createOrderDto);
  }

  @Get('my-orders')
  findAllForUser(@CurrentUser('id') userId: string) {
    return this.orderService.findAllForUser(userId);
  }

  @Get('shop-orders')
  findAllForShop(@CurrentUser('id') userId: string) {
    return this.orderService.findAllForShop(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findOne(id);
  }

  @Patch('shop-orders/:id/status')
  updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderShopId: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateOrderShopStatus(userId, orderShopId, status);
  }

  @Post(':id/cancel')
  cancelOrder(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.cancelOrder(userId, id);
  }
}
