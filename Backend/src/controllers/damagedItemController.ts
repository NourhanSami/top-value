import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createDamagedSchema = z.object({
  productId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  lossAmount: z.number().nonnegative().default(0),
  reason: z.string().min(1),
  damageType: z.enum(['expired', 'damaged', 'lost', 'other']).default('damaged'),
  notes: z.string().optional(),
  damagedAt: z.string().optional(),
});

export const getAllDamagedItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, damageType, branchId, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = {};
    if (status) where.status = status;
    if (damageType) where.damageType = damageType;
    if (branchId) where.branchId = parseInt(branchId as string);
    if (search) {
      where.OR = [
        { reason: { contains: search as string } },
        { product: { name: { contains: search as string } } },
        { product: { sku: { contains: search as string } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.damagedItem.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, sellingPrice: true } },
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: { damagedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.damagedItem.count({ where }),
    ]);
    res.json({ success: true, data: items, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) { next(error); }
};

export const createDamagedItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createDamagedSchema.parse(req.body);
    const userId = (req as any).user.id;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: validated.productId } });
      if (!product) throw new Error('المنتج غير موجود');
      if (product.stockQuantity < validated.quantity) throw new Error(`الكمية المطلوبة (${validated.quantity}) تتجاوز المخزون المتاح (${product.stockQuantity})`);

      const damagedItem = await tx.damagedItem.create({
        data: {
          productId: validated.productId,
          branchId: validated.branchId,
          userId,
          quantity: validated.quantity,
          lossAmount: validated.lossAmount,
          reason: validated.reason,
          damageType: validated.damageType,
          notes: validated.notes,
          damagedAt: validated.damagedAt ? new Date(validated.damagedAt) : new Date(),
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      // Deduct from stock immediately
      const newQty = product.stockQuantity - validated.quantity;
      await tx.product.update({ where: { id: validated.productId }, data: { stockQuantity: newQty } });
      await tx.inventoryTransaction.create({
        data: {
          productId: validated.productId,
          branchId: validated.branchId,
          userId,
          transactionType: 'damage',
          quantity: -validated.quantity,
          quantityBefore: product.stockQuantity,
          quantityAfter: newQty,
          unitCost: product.costPrice,
          referenceType: 'DamagedItem',
          referenceId: damagedItem.id,
          transactionDate: new Date(),
          notes: `تلف/هالك - ${validated.reason}`,
        },
      });

      return damagedItem;
    });

    res.status(201).json({ success: true, message: 'تم تسجيل الصنف التالف وخصمه من المخزون', data: result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

export const updateDamagedItemStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.id;
    const item = await prisma.damagedItem.update({
      where: { id: parseInt(id) },
      data: { status, approvedBy: userId, approvedAt: new Date() },
    });
    res.json({ success: true, message: 'تم تحديث الحالة', data: item });
  } catch (error) { next(error); }
};

export const getDamagedStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, totalLoss, pending, approved] = await Promise.all([
      prisma.damagedItem.count(),
      prisma.damagedItem.aggregate({ _sum: { lossAmount: true } }),
      prisma.damagedItem.count({ where: { status: 'pending' } }),
      prisma.damagedItem.count({ where: { status: 'approved' } }),
    ]);
    res.json({ success: true, data: { total, total_loss: totalLoss._sum.lossAmount || 0, pending, approved } });
  } catch (error) { next(error); }
};
