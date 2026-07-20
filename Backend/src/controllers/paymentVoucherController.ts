import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createVoucherSchema = z.object({
  voucherType: z.enum(['receipt', 'payment']),
  customerId: z.number().int().optional(),
  supplierId: z.number().int().optional(),
  branchId: z.number().int().positive(),
  bankAccountId: z.number().int().optional(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'bank', 'card', 'transfer']).default('cash'),
  referenceType: z.string().optional(),
  referenceId: z.number().int().optional(),
  voucherDate: z.string().optional(),
  notes: z.string().optional(),
});

async function generateVoucherNumber(type: string): Promise<string> {
  const today = new Date();
  const prefix = `${type === 'receipt' ? 'RCV' : 'PAY'}-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const count = await prisma.paymentVoucher.count({ where: { voucherNumber: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export const getAllVouchers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', voucherType, customerId, supplierId, dateFrom, dateTo } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = {};
    if (voucherType) where.voucherType = voucherType;
    if (customerId) where.customerId = parseInt(customerId as string);
    if (supplierId) where.supplierId = parseInt(supplierId as string);
    if (dateFrom || dateTo) {
      where.voucherDate = {};
      if (dateFrom) where.voucherDate.gte = new Date(dateFrom as string);
      if (dateTo) where.voucherDate.lte = new Date(dateTo as string);
    }
    const [vouchers, total] = await Promise.all([
      prisma.paymentVoucher.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, name: true, bankName: true } },
        },
        orderBy: { voucherDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.paymentVoucher.count({ where }),
    ]);
    res.json({ success: true, data: vouchers, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) { next(error); }
};

export const createVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createVoucherSchema.parse(req.body);
    const userId = (req as any).user.id;

    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.paymentVoucher.create({
        data: {
          voucherNumber: await generateVoucherNumber(validated.voucherType),
          ...validated,
          userId,
          voucherDate: validated.voucherDate ? new Date(validated.voucherDate) : new Date(),
        },
      });

      // Update customer balance on receipt
      if (validated.voucherType === 'receipt' && validated.customerId) {
        await tx.customer.update({ where: { id: validated.customerId }, data: { currentBalance: { decrement: validated.amount } } });
      }
      // Update supplier balance on payment
      if (validated.voucherType === 'payment' && validated.supplierId) {
        await tx.supplier.update({ where: { id: validated.supplierId }, data: { currentBalance: { decrement: validated.amount } } });
      }
      // Update bank account balance
      if (validated.bankAccountId) {
        const delta = validated.voucherType === 'receipt' ? validated.amount : -validated.amount;
        await tx.bankAccount.update({ where: { id: validated.bankAccountId }, data: { balance: { increment: delta } } });
      }

      return voucher;
    });

    res.status(201).json({ success: true, message: `تم إنشاء سند ${validated.voucherType === 'receipt' ? 'القبض' : 'الدفع'}`, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    next(error);
  }
};

export const getVoucherStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalReceipts, totalPayments] = await Promise.all([
      prisma.paymentVoucher.aggregate({ where: { voucherType: 'receipt' }, _sum: { amount: true }, _count: true }),
      prisma.paymentVoucher.aggregate({ where: { voucherType: 'payment' }, _sum: { amount: true }, _count: true }),
    ]);
    res.json({ success: true, data: { total_receipts: totalReceipts._sum.amount || 0, total_receipts_count: totalReceipts._count, total_payments: totalPayments._sum.amount || 0, total_payments_count: totalPayments._count } });
  } catch (error) { next(error); }
};
