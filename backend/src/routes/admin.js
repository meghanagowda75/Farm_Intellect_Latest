import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/audit-logs', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const records = await prisma.activity.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const logs = records.map((record) => ({
      id: record.id,
      action: record.action,
      description: record.description,
      actionType: record.action.split(' ')[0].toLowerCase(),
      createdAt: record.createdAt,
      user: record.user,
    }));

    return res.json({ logs });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
