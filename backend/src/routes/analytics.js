import express from 'express';
import {
  authenticate,
  authorize,
} from '../middleware/auth.js';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const getTimeframeDetails = (timeframe) => {
  const validTimeframes = ['7d', '30d', '90d'];
  const selectedTimeframe = validTimeframes.includes(String(timeframe))
    ? String(timeframe)
    : '30d';

  const days = Number.parseInt(selectedTimeframe, 10);
  const startDate = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  );

  return {
    timeframe: selectedTimeframe,
    startDate,
  };
};

// Get analytics data based on the authenticated user's role.
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { timeframe, startDate } = getTimeframeDetails(
      req.query.timeframe
    );

    const { role, id: userId } = req.user;

    let analytics;

    switch (role) {
      case 'FARMER':
        analytics = await getFarmerAnalytics(
          userId,
          timeframe,
          startDate
        );
        break;

      case 'MERCHANT':
        analytics = await getMerchantAnalytics(
          userId,
          timeframe,
          startDate
        );
        break;

      case 'EXPERT':
        analytics = await getExpertAnalytics(
          userId,
          timeframe,
          startDate
        );
        break;

      case 'ADMIN':
        analytics = await getAdminAnalytics(
          timeframe,
          startDate
        );
        break;

      default:
        return res.status(403).json({
          error: 'Invalid role',
        });
    }

    return res.json({ analytics });
  } catch (error) {
    logger.error('Get analytics error:', error);

    return res.status(500).json({
      error: 'Failed to fetch analytics',
    });
  }
});

// Get platform-wide analytics.
// ADMIN access is required because this endpoint returns
// aggregate information about all platform users.
router.get(
  '/platform-overview',
  authenticate,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { timeframe, startDate } = getTimeframeDetails(
        req.query.timeframe
      );

      const [
        totalUsers,
        newUsersInPeriod,
        usersByRole,
        totalActivity,
        activityGroups,
        cropCalendarEntries,
      ] = await Promise.all([
        prisma.user.count(),

        prisma.user.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),

        prisma.user.groupBy({
          by: ['role'],
          _count: {
            _all: true,
          },
        }),

        prisma.activity.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),

        prisma.activity.groupBy({
          by: ['action'],
          where: {
            createdAt: { gte: startDate },
          },
          _count: {
            _all: true,
          },
        }),

        prisma.cropCalendar.count({
          where: {
            deletedAt: null,
          },
        }),
      ]);

      const roleDistribution = {
        FARMER: 0,
        MERCHANT: 0,
        EXPERT: 0,
        ADMIN: 0,
      };

      for (const item of usersByRole) {
        roleDistribution[item.role] = item._count._all;
      }

      const activityByType = activityGroups.map((item) => ({
        type: item.action,
        count: item._count._all,
      }));

      return res.json({
        timeframe,
        totalUsers,
        newUsersInPeriod,
        roleDistribution,
        totalActivity,
        activityByType,
        cropCalendarEntries,

        // The supplied Prisma schema does not define a task model.
        totalTasks: null,
        tasksAvailable: false,
      });
    } catch (error) {
      logger.error('Platform overview error:', error);

      return res.status(500).json({
        error: 'Failed to fetch platform analytics from the database.',
      });
    }
  }
);

// Get the authenticated user's activity history.
router.get('/activity', authenticate, async (req, res) => {
  try {
    const pageValue = Number.parseInt(req.query.page, 10);
    const limitValue = Number.parseInt(req.query.limit, 10);

    const page = Number.isInteger(pageValue) && pageValue > 0
      ? pageValue
      : 1;

    const limit = Number.isInteger(limitValue) && limitValue > 0
      ? Math.min(limitValue, 100)
      : 20;

    const skip = (page - 1) * limit;

    const where = {
      userId: req.user.id,
    };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      prisma.activity.count({ where }),
    ]);

    return res.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get activity error:', error);

    return res.status(500).json({
      error: 'Failed to fetch activity',
    });
  }
});

// Farmer analytics.
const getFarmerAnalytics = async (
  userId,
  timeframe,
  startDate
) => {
  const [
    totalCrops,
    totalNotifications,
    documentsUploaded,
    forumPosts,
    aiInteractions,
  ] = await Promise.all([
    prisma.cropCalendar.count({
      where: {
        userId,
        deletedAt: null,
      },
    }),

    prisma.notification.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startDate },
      },
    }),

    prisma.document.count({
      where: {
        userId,
        deletedAt: null,
      },
    }),

    prisma.post.count({
      where: {
        authorId: userId,
        createdAt: { gte: startDate },
      },
    }),

    prisma.chatMessage.count({
      where: {
        userId,
        type: 'USER',
        deletedAt: null,
        createdAt: { gte: startDate },
      },
    }),
  ]);

  return {
    totalCrops,
    totalNotifications,
    documentsUploaded,
    forumPosts,
    aiInteractions,
    timeframe,
  };
};

// Merchant analytics.
const getMerchantAnalytics = async (
  userId,
  timeframe,
  startDate
) => {
  const [
    totalNotifications,
    documentsUploaded,
    forumPosts,
    activities,
  ] = await Promise.all([
    prisma.notification.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startDate },
      },
    }),

    prisma.document.count({
      where: {
        userId,
        deletedAt: null,
      },
    }),

    prisma.post.count({
      where: {
        authorId: userId,
        createdAt: { gte: startDate },
      },
    }),

    prisma.activity.count({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
    }),
  ]);

  return {
    totalNotifications,
    documentsUploaded,
    forumPosts,
    activities,
    timeframe,
  };
};

// Expert analytics.
const getExpertAnalytics = async (
  userId,
  timeframe,
  startDate
) => {
  const [
    consultations,
    forumPosts,
    documentsVerified,
    aiRecommendations,
  ] = await Promise.all([
    prisma.activity.count({
      where: {
        userId,
        action: {
          contains: 'consultation',
          mode: 'insensitive',
        },
        createdAt: { gte: startDate },
      },
    }),

    prisma.post.count({
      where: {
        authorId: userId,
        createdAt: { gte: startDate },
      },
    }),

    prisma.document.count({
      where: {
        deletedAt: null,
        verifiedAt: { gte: startDate },
      },
    }),

    prisma.aiRecommendation.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),
  ]);

  return {
    consultations,
    forumPosts,
    documentsVerified,
    aiRecommendations,
    timeframe,
  };
};

// Admin analytics.
const getAdminAnalytics = async (
  timeframe,
  startDate
) => {
  const [
    totalUsers,
    newUsersInPeriod,
    totalDocuments,
    pendingDocuments,
    totalPosts,
    totalNotifications,
    usersByRole,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),

    prisma.document.count({
      where: {
        deletedAt: null,
      },
    }),

    prisma.document.count({
      where: {
        isVerified: false,
        deletedAt: null,
      },
    }),

    prisma.post.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),

    prisma.notification.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate },
      },
    }),

    prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    }),
  ]);

  const roleDistribution = {
    FARMER: 0,
    MERCHANT: 0,
    EXPERT: 0,
    ADMIN: 0,
  };

  for (const item of usersByRole) {
    roleDistribution[item.role] = item._count.role;
  }

  return {
    totalUsers,
    newUsersInPeriod,
    totalDocuments,
    pendingDocuments,
    totalPosts,
    totalNotifications,
    roleDistribution,
    timeframe,
  };
};

export default router;