import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

export const logAction = async ({
  user,
  action,
  entityType,
  entityId,
  description,
  ipAddress = '127.0.0.1',
  metadata = {}
}) => {
  try {
    const log = await AuditLog.create({
      user: user ? user._id || user : null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      description,
      ipAddress,
      metadata
    });
    return log;
  } catch (error) {
    logger.error(`[Audit Service Error] Failed to write log: ${error.message}`);
  }
};
