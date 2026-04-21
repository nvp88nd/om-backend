import { Controller, Get, Post, Body, Patch, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrderStatus } from './order.constants';
import { CreateReturnRequestDto, ReviewReturnRequestDto } from './dto/return-request.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly shippingService: ShippingService,
  ) { }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(userId, createOrderDto);
  }

  @Post('calculate-shipping')
  calculateShipping(
    @CurrentUser('id') userId: string,
    @Body() dto: CalculateShippingDto,
  ) {
    return this.orderService.calculateShippingFee(userId, dto);
  }

  @Get('my-orders')
  findAllForUser(@CurrentUser('id') userId: string) {
    return this.orderService.findAllForUser(userId);
  }

  @Get('my-orders/:id')
  findOneForUser(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderService.findOneForUser(userId, id);
  }

  @Get('shop-orders')
  findAllForShop(@CurrentUser('id') userId: string) {
    return this.orderService.findAllForShop(userId);
  }

  @Post('return-requests')
  createReturnRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.orderService.createReturnRequest(userId, dto);
  }

  @Get('my-return-requests')
  findMyReturnRequests(@CurrentUser('id') userId: string) {
    return this.orderService.findMyReturnRequests(userId);
  }

  @Get('my-orders/:id/return-requests')
  findMyReturnRequestsForOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.orderService.findMyReturnRequestsForOrder(userId, orderId);
  }

  @Get('return-requests')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllReturnRequests() {
    return this.orderService.findAllReturnRequests();
  }

  @Patch('return-requests/:id/decision')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  reviewReturnRequest(
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() dto: ReviewReturnRequestDto,
  ) {
    return this.orderService.reviewReturnRequest(requestId, dto);
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
