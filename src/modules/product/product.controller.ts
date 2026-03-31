import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFilterDto, ProductStatus } from './dto/product-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // Public: Get all approved products with filtering/pagination
  @Get()
  findAll(@Query() filter: ProductFilterDto) {
    console.log('test');
    return this.productService.findAll(filter);
  }

  // Shop Owner: Get their own products
  @UseGuards(JwtAuthGuard)
  @Get('my-shop')
  findAllForShop(
    @CurrentUser('id') userId: string,
    @Query() filter: ProductFilterDto
  ) {
    return this.productService.findAllForShop(userId, filter);
  }

  // Public: Get product details
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id);
  }

  // Shop Owner: Create a product
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() createProductDto: CreateProductDto
  ) {
    return this.productService.create(userId, createProductDto);
  }

  // Shop Owner: Update a product
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productService.update(userId, id, updateProductDto);
  }

  // Shop Owner: Delete a product
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.productService.remove(userId, id);
  }

  // Admin: Approve/Reject product
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ProductStatus
  ) {
    return this.productService.updateStatus(id, status);
  }
}
