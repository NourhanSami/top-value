import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createReturnSchema = z.object({
  saleId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  reason: z.string().min(1),
  refundMethod: z.enum(['cash', 'credit']).default('cash'),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
});

async function generateReturnNumber(): Promise<string> {
  const today = new Date();
  const prefix = `RET-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const count = await prisma.saleReturn.count({ where: { returnNumber: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export const getAllReturns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search, branchId, dateFrom, dateTo } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = {};
    if (search) where.returnNumber = { contains: search as string };
    if (branchId) where.branchId = parseInt(branchId as string);
    if (dateFrom || dateTo) {
      where.returnDate = {};
      if (dateFrom) where.returnDate.gte = new Date(dateFrom as string);
      if (dateTo) where.returnDate.lte = new Date(dateTo as string);
    }
    const [returns, total] = await Promise.all([
      prisma.saleReturn.findMany({
        where,
        include: {
          sale: { select: { id: true, invoiceNumber: true } },
          user: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        orderBy: { returnDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.saleReturn.count({ where }),
    ]);
    res.json({ success: true, data: returns, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) { next(error); }
};

export const getReturnById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ret = await prisma.saleReturn.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { sale: true, user: { select: { id: true, name: true } }, branch: true, items: { include: { product: true } } },
    });
    if (!ret) return res.status(404).json({ success: false, message: 'المرتجع غير موجود' });
    res.json({ success: true, data: ret });
  } catch (error) { next(error); }
};

export const createReturn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createReturnSchema.parse(req.body);
    const userId = (req as any).user.id;

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: validated.saleId }, include: { items: true } });
      if (!sale) throw new Error('الفاتورة غير موجودة');

      const returnNumber = await generateReturnNumber();
      const totalRefund = validated.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      const saleReturn = await tx.saleReturn.create({
        data: {
          returnNumber,
          saleId: validated.saleId,
          userId,
          branchId: validated.branchId,
          returnDate: new Date(),
          reason: validated.reason,
          refundMethod: validated.refundMethod,
          totalRefund,
          notes: validated.notes,
          items: {
            create: validated.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.unitPrice * item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Restore stock
      for (const item of validated.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && product.trackInventory) {
          const newQty = product.stockQuantity + item.quantity;
          await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newQty } });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              branchId: validated.branchId,
              userId,
              transactionType: 'return',
              quantity: item.quantity,
              quantityBefore: product.stockQuantity,
              quantityAfter: newQty,
              unitCost: product.costPrice,
              referenceType: 'SaleReturn',
              referenceId: saleReturn.id,
              transactionDate: new Date(),
              notes: `مرتجع - ${returnNumber}`,
            },
          });
        }
      }

      // Update customer balance if credit refund
      if (validated.refundMethod === 'credit' && sale.customerId) {
        await tx.customer.update({ where: { id: sale.customerId }, data: { currentBalance: { decrement: totalRefund } } });
      }

      return saleReturn;
    });

    res.status(201).json({ success: true, message: 'تم إنشاء المرتجع بنجاح', data: result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

export const getReturnStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, totalAmount, cashRefunds, creditRefunds] = await Promise.all([
      prisma.saleReturn.count(),
      prisma.saleReturn.aggregate({ _sum: { totalRefund: true } }),
      prisma.saleReturn.aggregate({ where: { refundMethod: 'cash' }, _sum: { totalRefund: true } }),
      prisma.saleReturn.aggregate({ where: { refundMethod: 'credit' }, _sum: { totalRefund: true } }),
    ]);
    res.json({ success: true, data: { total, total_amount: totalAmount._sum.totalRefund || 0, cash_refunds: cashRefunds._sum.totalRefund || 0, credit_refunds: creditRefunds._sum.totalRefund || 0 } });
  } catch (error) { next(error); }
};
