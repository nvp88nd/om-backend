import { Injectable } from '@nestjs/common';
import { CreateContentSystemDto } from './dto/create-content_system.dto';
import { UpdateContentSystemDto } from './dto/update-content_system.dto';

@Injectable()
export class ContentSystemService {
  create(createContentSystemDto: CreateContentSystemDto) {
    return 'This action adds a new contentSystem';
  }

  findAll() {
    return `This action returns all contentSystem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} contentSystem`;
  }

  update(id: number, updateContentSystemDto: UpdateContentSystemDto) {
    return `This action updates a #${id} contentSystem`;
  }

  remove(id: number) {
    return `This action removes a #${id} contentSystem`;
  }
}
