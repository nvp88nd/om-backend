import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Like, Between, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { VariantAttribute } from './entities/variant-attribute.entity';
import { Category } from './entities/category.entity';
import { Shop } from '../shop/entities/shop.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto, ProductStatus } from './dto/product-filter.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private dataSource: DataSource,
  ) { }

  async create(userId: string, createProductDto: CreateProductDto) {
    const shop = await this.shopRepository.findOne({ where: { owner: { id: userId } } });
    if (!shop) {
      throw new BadRequestException('User does not have a shop');
    }

    const category = await this.categoryRepository.findOne({ where: { id: createProductDto.category_id } });
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Ensure slug is unique
    const existingProduct = await this.productRepository.findOne({ where: { slug: createProductDto.slug } });
    if (existingProduct) {
      throw new ConflictException('Product slug already exists');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Product
      const product = queryRunner.manager.create(Product, {
        shop,
        category,
        name: createProductDto.name,
        slug: createProductDto.slug,
        description: createProductDto.description,
        base_price: createProductDto.base_price,
        status: ProductStatus.PENDING,
      });
      const savedProduct = await queryRunner.manager.save(product);

      // 2. Create Images
      if (createProductDto.images && createProductDto.images.length > 0) {
        const images = createProductDto.images.map(img =>
          queryRunner.manager.create(ProductImage, {
            product: savedProduct,
            image_url: img.image_url,
            is_main: img.is_main || false,
          })
        );
        await queryRunner.manager.save(images);
      }

      // 3. Create Variants & VariantAttributes
      if (createProductDto.variants && createProductDto.variants.length > 0) {
        for (const variantDto of createProductDto.variants) {
          const variant = queryRunner.manager.create(ProductVariant, {
            product: savedProduct,
            sku: variantDto.sku,
            price: variantDto.price,
            stock: variantDto.stock,
          });
          const savedVariant = await queryRunner.manager.save(variant);

          if (variantDto.attribute_value_ids && variantDto.attribute_value_ids.length > 0) {
            const variantAttributes = variantDto.attribute_value_ids.map(attrValId =>
              queryRunner.manager.create(VariantAttribute, {
                variant_id: savedVariant.id,
                attribute_value_id: attrValId,
              })
            );
            await queryRunner.manager.save(variantAttributes);
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedProduct.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filter: ProductFilterDto) {
    const {
      search, category_id, shop_id, min_price, max_price, status,
      page = 1, limit = 10, sort_by = 'created_at', sort_order = 'DESC'
    } = filter;

    const query = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.shop', 'shop')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`product.${sort_by}`, sort_order);

    if (search) {
      query.andWhere('(product.name LIKE :search OR product.description LIKE :search OR product.slug LIKE :search)', {
        search: `%${search}%`
      });
    }

    if (category_id) {
      query.andWhere('product.category_id = :category_id', { category_id });
    }

    if (shop_id) {
      query.andWhere('product.shop_id = :shop_id', { shop_id });
    }

    if (min_price !== undefined) {
      query.andWhere('product.base_price >= :min_price', { min_price });
    }

    if (max_price !== undefined) {
      query.andWhere('product.base_price <= :max_price', { max_price });
    }

    if (status !== undefined) {
      query.andWhere('product.status = :status', { status });
    } else {
      // By default, only show approved products for general listing
      query.andWhere('product.status = :approved', { approved: ProductStatus.APPROVED });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  // Get products for a specific shop (owner view)
  async findAllForShop(userId: string, filter: ProductFilterDto) {
    const shop = await this.shopRepository.findOne({ where: { owner: { id: userId } } });
    if (!shop) {
      throw new BadRequestException('User does not have a shop');
    }

    const {
      search, category_id, min_price, max_price, status,
      page = 1, limit = 10, sort_by = 'created_at', sort_order = 'DESC'
    } = filter;

    const query = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'image')
      .where('product.shop_id = :shopId', { shopId: shop.id })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`product.${sort_by}`, sort_order);

    if (search) {
      query.andWhere('(product.name LIKE :search OR product.slug LIKE :search)', { search: `%${search}%` });
    }

    if (category_id) {
      query.andWhere('product.category_id = :category_id', { category_id });
    }

    if (status !== undefined) {
      query.andWhere('product.status = :status', { status });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: [
        'category',
        'images',
        'variants',
        'variants.attributes',
        'variants.attributes.attributeValue',
        'variants.attributes.attributeValue.attribute',
        'shop'
      ],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findSimilar(id: string, limitInput?: number) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const limit = Number.isFinite(limitInput) && Number(limitInput) > 0
      ? Math.min(Math.floor(Number(limitInput)), 24)
      : 6;

    const similarInCategory = await this.productRepository.find({
      where: {
        category: { id: product.category?.id },
        status: ProductStatus.APPROVED,
      },
      relations: ['category', 'images', 'shop'],
      order: { created_at: 'DESC' },
      take: limit + 1,
    });

    const filteredPrimary = similarInCategory.filter((item) => item.id !== id).slice(0, limit);

    if (filteredPrimary.length >= limit) {
      return filteredPrimary;
    }

    const fallback = await this.productRepository.find({
      where: {
        status: ProductStatus.APPROVED,
      },
      relations: ['category', 'images', 'shop'],
      order: { created_at: 'DESC' },
      take: limit + 12,
    });

    const existingIds = new Set(filteredPrimary.map((item) => item.id));
    const merged = [...filteredPrimary];

    for (const item of fallback) {
      if (item.id === id || existingIds.has(item.id)) {
        continue;
      }

      merged.push(item);
      existingIds.add(item.id);

      if (merged.length >= limit) {
        break;
      }
    }

    return merged;
  }

  async update(userId: string, id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['shop']
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Authorization check
    const shop = await this.shopRepository.findOne({ where: { owner: { id: userId } } });
    if (!shop || product.shop.id !== shop.id) {
      throw new BadRequestException('You are not allowed to update this product');
    }

    if (updateProductDto.name) product.name = updateProductDto.name;

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existingProduct = await this.productRepository.findOne({ where: { slug: updateProductDto.slug } });
      if (existingProduct) {
        throw new ConflictException('Product slug already exists');
      }
      product.slug = updateProductDto.slug;
    }

    if (updateProductDto.description !== undefined) product.description = updateProductDto.description;
    if (updateProductDto.base_price !== undefined) product.base_price = updateProductDto.base_price;
    if (updateProductDto.category_id) {
      const category = await this.categoryRepository.findOne({ where: { id: updateProductDto.category_id } });
      if (!category) throw new BadRequestException('Category not found');
      product.category = category;
    }

    // Optional: Reset status to pending if key fields are updated
    // product.status = ProductStatus.PENDING;

    await this.productRepository.save(product);
    return this.findOne(product.id);
  }

  async remove(userId: string, id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['shop']
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const shop = await this.shopRepository.findOne({ where: { owner: { id: userId } } });
    if (!shop || product.shop.id !== shop.id) {
      throw new BadRequestException('You are not allowed to delete this product');
    }

    await this.productRepository.remove(product);
    return { message: 'Product deleted successfully' };
  }

  // Admin approval
  async updateStatus(id: string, status: ProductStatus) {
    const product = await this.findOne(id);
    product.status = status;
    return this.productRepository.save(product);
  }
}
