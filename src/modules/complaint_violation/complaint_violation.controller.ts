import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComplaintViolationService } from './complaint_violation.service';
import { CreateComplaintViolationDto } from './dto/create-complaint_violation.dto';
import { UpdateComplaintViolationDto } from './dto/update-complaint_violation.dto';

@Controller('complaint-violation')
export class ComplaintViolationController {
  constructor(private readonly complaintViolationService: ComplaintViolationService) {}

  @Post()
  create(@Body() createComplaintViolationDto: CreateComplaintViolationDto) {
    return this.complaintViolationService.create(createComplaintViolationDto);
  }

  @Get()
  findAll() {
    return this.complaintViolationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complaintViolationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComplaintViolationDto: UpdateComplaintViolationDto) {
    return this.complaintViolationService.update(+id, updateComplaintViolationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.complaintViolationService.remove(+id);
  }
}
