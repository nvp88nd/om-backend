import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationBroadcast } from './entities/notification_broadcast.entity';
import { NotificationGateway } from './notification.gateway';
import { NotificationStatus, NotificationType } from './notification.constants';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationBroadcast)
    private readonly broadcastRepository: Repository<NotificationBroadcast>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createNotification(data: {
    user_id: string;
    title: string;
    content: string;
    type: NotificationType;
    reference_id?: string;
  }) {
    const notification = this.notificationRepository.create({
      ...data,
      is_read: NotificationStatus.UNREAD,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Push realtime notification
    this.notificationGateway.sendNotificationToUser(data.user_id, savedNotification);

    return savedNotification;
  }

  async broadcastNotification(data: {
    title: string;
    content: string;
    type: NotificationType;
  }) {
    const broadcast = this.broadcastRepository.create(data);
    const savedBroadcast = await this.broadcastRepository.save(broadcast);

    // Push realtime broadcast
    this.notificationGateway.broadcastNotification(savedBroadcast);

    return savedBroadcast;
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.notificationRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.is_read = NotificationStatus.READ;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: NotificationStatus.READ })
      .where('user_id = :userId', { userId })
      .execute();

    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { user_id: userId, is_read: NotificationStatus.UNREAD },
    });
    return { count };
  }

  async deleteNotification(id: string, userId: string) {
    const result = await this.notificationRepository.delete({ id, user_id: userId });
    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
    return { success: true };
  }
}
