import { PartialType } from '@nestjs/mapped-types';
import { CreateComplaintViolationDto } from './create-complaint_violation.dto';

export class UpdateComplaintViolationDto extends PartialType(CreateComplaintViolationDto) {}
