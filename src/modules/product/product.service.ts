import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Like, Between, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { OrderStatus } from '../order/order.constants';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { VariantAttribute } from './entities/variant-attribute.entity';
import { Category } from './entities/category.entity';
import { Shop } from '../shop/entities/shop.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto, ProductStatus } from './dto/product-filter.dto';
import { ContentSystemService } from '../content_system/content_system.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly contentSystemService: ContentSystemService,
    private dataSource: DataSource,
  ) { }

  async create(userId: string, createProductDto: CreateProductDto) {
    const productContent = `${createProductDto.name || ''} ${createProductDto.description || ''}`.trim();
    if (productContent) {
      const containsBanned = await this.contentSystemService.checkContent(productContent);
      if (containsBanned) {
        throw new BadRequestException('Product contains banned content');
      }
    }

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
      // add sold_count as a subselect (sum of delivered order item quantities)
      .addSelect((subQuery) =>
        subQuery
          .select('COALESCE(SUM(oi.quantity), 0)', 'sold_count')
          .from(OrderItem, 'oi')
          .innerJoin('oi.orderShop', 'os')
          .innerJoin('oi.variant', 'pv')
          .where('pv.product_id = product.id')
          .andWhere('os.status = :deliveredStatus'),
        'sold_count',
      )
      .setParameter('deliveredStatus', OrderStatus.COMPLETED)
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`product.${sort_by}`, sort_order);

    if (search) {
      query.andWhere('(product.name LIKE :search OR product.description LIKE :search OR product.slug LIKE :search)', {
        search: `%${search}%`
      });
    }

    if (category_id) {
      query.andWhere('product.category = :category_id', { category_id });
    }

    if (shop_id) {
      query.andWhere('product.shop = :shop_id', { shop_id });
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

    const total = await query.getCount();
    const { entities, raw } = await query.getRawAndEntities();
    const items = entities.map((item, index) => ({
      ...item,
      sold_count: Number(raw[index]?.sold_count ?? 0),
    }));

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
      .where('product.shop = :shopId', { shopId: shop.id })
      // include sold_count for shop owner view as well
      .addSelect((subQuery) =>
        subQuery
          .select('COALESCE(SUM(oi.quantity), 0)', 'sold_count')
          .from(OrderItem, 'oi')
          .innerJoin('oi.orderShop', 'os')
          .innerJoin('oi.variant', 'pv')
          .where('pv.product_id = product.id')
          .andWhere('os.status = :deliveredStatus'),
        'sold_count',
      )
      .setParameter('deliveredStatus', OrderStatus.COMPLETED)
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`product.${sort_by}`, sort_order);

    if (search) {
      query.andWhere('(product.name LIKE :search OR product.slug LIKE :search)', { search: `%${search}%` });
    }

    if (category_id) {
      query.andWhere('product.category = :category_id', { category_id });
    }

    if (status !== undefined) {
      query.andWhere('product.status = :status', { status });
    }

    const total = await query.getCount();
    const { entities, raw } = await query.getRawAndEntities();
    const items = entities.map((item, index) => ({
      ...item,
      sold_count: Number(raw[index]?.sold_count ?? 0),
    }));

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    // use query builder to also fetch sold_count
    const { entities, raw } = await this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('variants.attributes', 'variant_attributes')
      .leftJoinAndSelect('variant_attributes.attributeValue', 'attribute_value')
      .leftJoinAndSelect('attribute_value.attribute', 'attribute')
      .leftJoinAndSelect('product.shop', 'shop')
      .addSelect((subQuery) =>
        subQuery
          .select('COALESCE(SUM(oi.quantity), 0)', 'sold_count')
          .from(OrderItem, 'oi')
          .innerJoin('oi.orderShop', 'os')
          .innerJoin('oi.variant', 'pv')
          .where('pv.product_id = product.id')
          .andWhere('os.status = :deliveredStatus'),
        'sold_count',
      )
      .setParameter('deliveredStatus', OrderStatus.COMPLETED)
      .where('product.id = :id', { id })
      .orderBy('images.created_at', 'ASC')
      .getRawAndEntities();
    const product = entities[0];
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return {
      ...product,
      sold_count: Number(raw[0]?.sold_count ?? 0),
    };
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
    const updateContent = `${updateProductDto.name || ''} ${updateProductDto.description || ''}`.trim();
    if (updateContent) {
      const containsBanned = await this.contentSystemService.checkContent(updateContent);
      if (containsBanned) {
        throw new BadRequestException('Product contains banned content');
      }
    }

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

    const hasImagesUpdate = updateProductDto.images !== undefined;
    const hasVariantsUpdate = updateProductDto.variants !== undefined;

    if (hasImagesUpdate || hasVariantsUpdate) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.manager.save(product);

        if (hasImagesUpdate) {
          await queryRunner.manager.delete(ProductImage, { product: { id: product.id } });
          const newImages = (updateProductDto.images || []).map(img =>
            queryRunner.manager.create(ProductImage, {
              product: product,
              image_url: img.image_url,
              is_main: img.is_main || false,
            })
          );
          await queryRunner.manager.save(newImages);
        }

        if (hasVariantsUpdate) {
          const existingVariants = await queryRunner.manager.find(ProductVariant, {
            where: { product: { id: product.id } },
          });
          const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));
          const existingIds = existingVariants.map((variant) => variant.id);

          const protectedIds = new Set<string>();
          if (existingIds.length > 0) {
            const protectedRows = await queryRunner.manager
              .getRepository(OrderItem)
              .createQueryBuilder('oi')
              .select('oi.variant_id', 'variant_id')
              .where('oi.variant_id IN (:...variantIds)', { variantIds: existingIds })
              .groupBy('oi.variant_id')
              .getRawMany<{ variant_id: string }>();

            for (const row of protectedRows) {
              if (row.variant_id) {
                protectedIds.add(row.variant_id);
              }
            }
          }

          const variants = updateProductDto.variants || [];
          const incomingIds = new Set(
            variants.map((variant) => variant.id).filter((id): id is string => Boolean(id)),
          );

          for (const existing of existingVariants) {
            if (!incomingIds.has(existing.id)) {
              if (protectedIds.has(existing.id)) {
                continue;
              }
              await queryRunner.manager.delete(ProductVariant, { id: existing.id });
            }
          }

          for (const variantDto of variants) {
            if (variantDto.id && existingById.has(variantDto.id)) {
              const existing = existingById.get(variantDto.id)!;
              existing.sku = variantDto.sku ?? '';
              existing.price = variantDto.price;
              existing.stock = variantDto.stock;
              await queryRunner.manager.save(existing);

              await queryRunner.manager.delete(VariantAttribute, { variant_id: existing.id });
              if (variantDto.attribute_value_ids && variantDto.attribute_value_ids.length > 0) {
                const variantAttributes = variantDto.attribute_value_ids.map(attrValId =>
                  queryRunner.manager.create(VariantAttribute, {
                    variant_id: existing.id,
                    attribute_value_id: attrValId,
                  })
                );
                await queryRunner.manager.save(variantAttributes);
              }
              continue;
            }

            const variant = queryRunner.manager.create(ProductVariant, {
              product,
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
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      await this.productRepository.save(product);
    }

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

  async findFlashSale(limit: number = 6) {
    return this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.shop', 'shop')
      .where('product.status = :approved', { approved: ProductStatus.APPROVED })
      .orderBy('RAND()') // Get random products for Flash Sale
      .take(limit)
      .getMany();
  }
}
