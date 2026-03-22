import { PartialType } from '@nestjs/mapped-types';
import { CreateContentSystemDto } from './create-content_system.dto';

export class UpdateContentSystemDto extends PartialType(CreateContentSystemDto) {}
