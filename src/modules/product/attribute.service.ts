import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

@Injectable()
export class AttributeService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
    @InjectRepository(AttributeValue)
    private readonly attributeValueRepository: Repository<AttributeValue>,
  ) {}

  async create(createAttributeDto: CreateAttributeDto) {
    const attribute = this.attributeRepository.create({ name: createAttributeDto.name });
    await this.attributeRepository.save(attribute);

    if (createAttributeDto.values && createAttributeDto.values.length > 0) {
      const values = createAttributeDto.values.map(val => 
        this.attributeValueRepository.create({ attribute, value: val })
      );
      await this.attributeValueRepository.save(values);
    }

    return this.findOne(attribute.id);
  }

  findAll() {
    return this.attributeRepository.find({ relations: ['values'] });
  }

  async findOne(id: string) {
    const attribute = await this.attributeRepository.findOne({
      where: { id },
      relations: ['values']
    });
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }
    return attribute;
  }

  async update(id: string, updateAttributeDto: UpdateAttributeDto) {
    const attribute = await this.findOne(id);

    if (updateAttributeDto.name) {
      attribute.name = updateAttributeDto.name;
      await this.attributeRepository.save(attribute);
    }

    if (updateAttributeDto.values) {
      // Simple strategy: remove old values not in list, add new ones.
      // For a more robust solution, we'd need to avoid deleting values tied to products.
      // But for now, we'll just add non-existing ones.
      const existingValues = attribute.values.map(v => v.value);
      const newValues = updateAttributeDto.values.filter(v => !existingValues.includes(v));

      if (newValues.length > 0) {
        const valuesToCreate = newValues.map(val => 
          this.attributeValueRepository.create({ attribute, value: val })
        );
        await this.attributeValueRepository.save(valuesToCreate);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const attribute = await this.findOne(id);
    await this.attributeRepository.remove(attribute);
    return { message: 'Attribute deleted successfully' };
  }
}
