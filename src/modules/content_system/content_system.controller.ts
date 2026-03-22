import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContentSystemService } from './content_system.service';
import { CreateContentSystemDto } from './dto/create-content_system.dto';
import { UpdateContentSystemDto } from './dto/update-content_system.dto';

@Controller('content-system')
export class ContentSystemController {
  constructor(private readonly contentSystemService: ContentSystemService) {}

  @Post()
  create(@Body() createContentSystemDto: CreateContentSystemDto) {
    return this.contentSystemService.create(createContentSystemDto);
  }

  @Get()
  findAll() {
    return this.contentSystemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentSystemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContentSystemDto: UpdateContentSystemDto) {
    return this.contentSystemService.update(+id, updateContentSystemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contentSystemService.remove(+id);
  }
}
