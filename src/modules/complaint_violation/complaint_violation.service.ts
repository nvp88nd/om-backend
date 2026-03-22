import { Injectable } from '@nestjs/common';
import { CreateComplaintViolationDto } from './dto/create-complaint_violation.dto';
import { UpdateComplaintViolationDto } from './dto/update-complaint_violation.dto';

@Injectable()
export class ComplaintViolationService {
  create(createComplaintViolationDto: CreateComplaintViolationDto) {
    return 'This action adds a new complaintViolation';
  }

  findAll() {
    return `This action returns all complaintViolation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} complaintViolation`;
  }

  update(id: number, updateComplaintViolationDto: UpdateComplaintViolationDto) {
    return `This action updates a #${id} complaintViolation`;
  }

  remove(id: number) {
    return `This action removes a #${id} complaintViolation`;
  }
}
