import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createScheduleSchema = z.object({
  customerId: z.number().int().optional(),
  supplierId: z.number().int().optional(),
  saleId: z.number().int().optional(),
  purchaseId: z.number().int().optional(),
  amount: z.number().positive(),
  dueDate: z.string(),
  notes: z.string().optional(),
});

export const getAllSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, customerId, supplierId, overdue, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = {};
    if (status && status !== 'overdue') where.status = status;
    if (customerId) where.customerId = parseInt(customerId as string);
    if (supplierId) where.supplierId = parseInt(supplierId as string);
    if (overdue === 'true' || status === 'overdue') {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'paid' };
    }
    if (search) {
      const q = search as string;
      where.OR = [
        { notes: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { phone: { contains: q } } },
        { supplier: { name: { contains: q } } },
      ];
    }

    const [schedules, total] = await Promise.all([
      prisma.paymentSchedule.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.paymentSchedule.count({ where }),
    ]);
    res.json({ success: true, data: schedules, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) { next(error); }
};

export const createSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createScheduleSchema.parse(req.body);
    const schedule = await prisma.paymentSchedule.create({ data: { ...validated, dueDate: new Date(validated.dueDate) } });
    res.status(201).json({ success: true, message: 'تم إضافة القسط', data: schedule });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    next(error);
  }
};

export const markSchedulePaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { paidAmount } = req.body;
    const schedule = await prisma.paymentSchedule.findUnique({ where: { id: parseInt(id) } });
    if (!schedule) return res.status(404).json({ success: false, message: 'القسط غير موجود' });
    const newPaid = Number(schedule.paidAmount) + (paidAmount || Number(schedule.amount));
    const status = newPaid >= Number(schedule.amount) ? 'paid' : 'partial';
    const updated = await prisma.paymentSchedule.update({ where: { id: parseInt(id) }, data: { paidAmount: newPaid, status, paidAt: status === 'paid' ? new Date() : null } });
    res.json({ success: true, message: 'تم تحديث حالة القسط', data: updated });
  } catch (error) { next(error); }
};

export const getOverdueSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const overdue = await prisma.paymentSchedule.findMany({
      where: { dueDate: { lt: new Date() }, status: { not: 'paid' } },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ success: true, data: overdue, count: overdue.length });
  } catch (error) { next(error); }
};
