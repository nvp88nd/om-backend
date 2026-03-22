import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './entities/complaint.entity';
import { Violation } from './entities/violation.entity';
import { CreateComplaintDto, CreateViolationDto, ComplaintStatus } from './dto/complaint_violation.dto';

@Injectable()
export class ComplaintViolationService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepository: Repository<Complaint>,
    @InjectRepository(Violation)
    private readonly violationRepository: Repository<Violation>,
  ) {}

  // Complaint
  async createComplaint(userId: string, dto: CreateComplaintDto) {
    const complaint = this.complaintRepository.create({
      ...dto,
      user_id: userId,
      status: ComplaintStatus.PENDING,
    });
    return this.complaintRepository.save(complaint);
  }

  async findAllComplaints() {
    return this.complaintRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOneComplaint(id: string) {
    const complaint = await this.complaintRepository.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return complaint;
  }

  async updateComplaintStatus(id: string, status: ComplaintStatus) {
    const complaint = await this.findOneComplaint(id);
    complaint.status = status;
    return this.complaintRepository.save(complaint);
  }

  // Violation
  async createViolation(dto: CreateViolationDto) {
    const violation = this.violationRepository.create(dto);
    return this.violationRepository.save(violation);
  }

  async findAllViolations() {
    return this.violationRepository.find({ order: { created_at: 'DESC' } });
  }

  async findViolationsByUser(userId: string) {
    return this.violationRepository.find({ where: { user_id: userId }, order: { created_at: 'DESC' } });
  }
}
