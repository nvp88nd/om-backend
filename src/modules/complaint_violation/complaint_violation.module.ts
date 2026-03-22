import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintViolationService } from './complaint_violation.service';
import { ComplaintViolationController } from './complaint_violation.controller';
import { Complaint } from './entities/complaint.entity';
import { Violation } from './entities/violation.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Complaint, Violation]),
    AuthModule,
  ],
  controllers: [ComplaintViolationController],
  providers: [ComplaintViolationService],
  exports: [ComplaintViolationService],
})
export class ComplaintViolationModule {}
