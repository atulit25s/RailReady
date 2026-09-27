import { Notification } from '../models/Notification.js';
import { logger } from '../utils/logger.js';

export const createNotification = async ({
  recipient,
  title,
  message,
  type = 'SYSTEM',
  link = '',
  io = null
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      title,
      message,
      type,
      link
    });

    if (io) {
      // Emit to specific user room or broadcast
      io.to(`user_${recipient}`).emit('notification', notification);
      io.emit('global_activity', {
        title,
        message,
        type,
        timestamp: new Date().toISOString()
      });
    }

    return notification;
  } catch (error) {
    logger.error(`[Notification Service Error] ${error.message}`);
  }
};
