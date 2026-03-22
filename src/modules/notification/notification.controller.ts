import { Controller, Get, Patch, Param, Delete, UseGuards, Query, ParseUUIDPipe, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationType } from './notification.constants';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getNotifications(userId, page ? +page : 1, limit ? +limit : 20);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.notificationService.deleteNotification(id, userId);
  }

  // Admin: Broadcast a notification to all users
  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  broadcast(
    @Body() data: { title: string; content: string; type: NotificationType }
  ) {
    return this.notificationService.broadcastNotification(data);
  }
}
