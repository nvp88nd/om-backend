import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminLog } from './entities/admin-log.entity';
import { CreateAdminLogDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminLog)
    private readonly adminLogRepository: Repository<AdminLog>,
  ) {}

  async createLog(adminId: string, dto: CreateAdminLogDto) {
    const log = this.adminLogRepository.create({
      ...dto,
      admin: { id: adminId } as any,
    });
    return this.adminLogRepository.save(log);
  }

  async findAllLogs() {
    return this.adminLogRepository.find({
      relations: ['admin'],
      order: { created_at: 'DESC' },
    });
  }

  async findLogsByAdmin(adminId: string) {
    return this.adminLogRepository.find({
      where: { admin: { id: adminId } },
      order: { created_at: 'DESC' },
    });
  }
}
