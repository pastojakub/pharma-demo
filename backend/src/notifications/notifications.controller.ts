import { Controller, Get, Post, Param, UseGuards, Request, ParseIntPipe, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyNotifications(@Request() req) {
    this.logger.debug(`Fetching notifications for user ID: ${req.user.userId}`);
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { 
          userId: req.user.userId,
          isRead: false 
        },
        orderBy: { createdAt: 'desc' }
      });
      this.logger.debug(`Found ${notifications.length} notifications.`);
      return notifications;
    } catch (error) {
      this.logger.error(`Failed to fetch notifications: ${error.message}`);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  async markAsRead(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.prisma.notification.update({
      where: { 
        id,
        userId: req.user.userId 
      },
      data: { isRead: true }
    });
  }
}
