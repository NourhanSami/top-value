import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { backfillActivityLogsIfEmpty } from '../services/activityLogService';

const prisma = new PrismaClient();

function dateRangeFromFilter(dateFilter?: string) {
  if (!dateFilter || dateFilter === 'all') return undefined;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateFilter) {
    case 'today':
      return { gte: today };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { gte: y, lt: today };
    }
    case 'week': {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      return { gte: w };
    }
    case 'month':
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    default:
      return undefined;
  }
}

export const getAllActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await backfillActivityLogsIfEmpty();

    const {
      page = '1',
      limit = '30',
      search,
      action,
      userId,
      dateFilter = 'all',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = {};

    if (action && action !== 'all') where.action = action as string;
    if (userId && userId !== 'all') where.userId = parseInt(userId as string);

    const createdAt = dateRangeFromFilter(dateFilter as string);
    if (createdAt) where.createdAt = createdAt;

    if (search) {
      const q = search as string;
      where.OR = [
        { description: { contains: q } },
        { action: { contains: q } },
        { entityType: { contains: q } },
        { user: { name: { contains: q } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              roles: { include: { role: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getActivityStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await backfillActivityLogsIfEmpty();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, activeUsers, totalSales, totalUpdates, totalAll] = await Promise.all([
      prisma.activityLog.count({ where: { createdAt: { gte: today } } }),
      prisma.activityLog.findMany({
        where: { createdAt: { gte: today }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.activityLog.count({ where: { action: 'sale' } }),
      prisma.activityLog.count({ where: { action: { in: ['update', 'create', 'delete'] } } }),
      prisma.activityLog.count(),
    ]);

    res.json({
      success: true,
      data: {
        totalToday,
        activeUsers: activeUsers.length,
        totalSales,
        totalUpdates,
        totalAll,
      },
    });
  } catch (error) {
    next(error);
  }
};
