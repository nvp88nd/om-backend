import { Controller, Get, Post, Body, UseGuards, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminLogDto } from './dto/admin.dto';
import { AdminUserFilterDto, UpdateUserStatusDto } from './dto/admin-user.dto';
import { AdminWithdrawalFilterDto, ProcessWithdrawalDto } from './dto/admin-finance.dto';
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

  @Get('users')
  findUsers(@Query() filter: AdminUserFilterDto) {
    return this.adminService.findUsers(filter);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(adminId, userId, dto);
  }

  @Get('finance/withdrawals')
  findWithdrawals(@Query() filter: AdminWithdrawalFilterDto) {
    return this.adminService.findWithdrawals(filter);
  }

  @Patch('finance/withdrawals/:id/process')
  processWithdrawal(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) withdrawalId: string,
    @Body() dto: ProcessWithdrawalDto,
  ) {
    return this.adminService.processWithdrawal(adminId, withdrawalId, dto.status);
  }
}
