import { Controller, Get, Post, Body, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminLogDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('logs')
  createLog(@CurrentUser('id') adminId: string, @Body() dto: CreateAdminLogDto) {
    return this.adminService.createLog(adminId, dto);
  }

  @Get('logs')
  findAllLogs() {
    return this.adminService.findAllLogs();
  }

  @Get('logs/:adminId')
  findLogsByAdmin(@Param('adminId', ParseUUIDPipe) adminId: string) {
    return this.adminService.findLogsByAdmin(adminId);
  }
}
