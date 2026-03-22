import { Module } from '@nestjs/common';
import { ComplaintViolationService } from './complaint_violation.service';
import { ComplaintViolationController } from './complaint_violation.controller';

@Module({
  controllers: [ComplaintViolationController],
  providers: [ComplaintViolationService],
})
export class ComplaintViolationModule {}
