import { Controller, Get, Post, Body, Patch, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ComplaintViolationService } from './complaint_violation.service';
import { CreateComplaintDto, CreateViolationDto, ComplaintStatus } from './dto/complaint_violation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('complaint-violation')
@UseGuards(JwtAuthGuard)
export class ComplaintViolationController {
  constructor(private readonly service: ComplaintViolationService) {}

  // User: File a complaint
  @Post('complaints')
  createComplaint(@CurrentUser('id') userId: string, @Body() dto: CreateComplaintDto) {
    return this.service.createComplaint(userId, dto);
  }

  // Admin: Get all complaints
  @Get('complaints')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllComplaints() {
    return this.service.findAllComplaints();
  }

  // Admin: Update complaint status
  @Patch('complaints/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateComplaintStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ComplaintStatus
  ) {
    return this.service.updateComplaintStatus(id, status);
  }

  // Admin: Record a violation
  @Post('violations')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createViolation(@Body() dto: CreateViolationDto) {
    return this.service.createViolation(dto);
  }

  // Admin: Get all violations
  @Get('violations')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllViolations() {
    return this.service.findAllViolations();
  }

  // User: Get my violations
  @Get('my-violations')
  findMyViolations(@CurrentUser('id') userId: string) {
    return this.service.findViolationsByUser(userId);
  }
}
