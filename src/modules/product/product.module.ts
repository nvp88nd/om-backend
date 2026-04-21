import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AttributeService } from './attribute.service';
import { AttributeController } from './attribute.controller';

import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { VariantAttribute } from './entities/variant-attribute.entity';
import { Shop } from '../shop/entities/shop.entity';
import { ContentSystemModule } from '../content_system/content_system.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      ProductImage,
      Category,
      Attribute,
      AttributeValue,
      VariantAttribute,
      Shop,
    ]),
    ContentSystemModule,
  ],
  controllers: [ProductController, CategoryController, AttributeController],
  providers: [ProductService, CategoryService, AttributeService],
  exports: [ProductService],
})
export class ProductModule { }
