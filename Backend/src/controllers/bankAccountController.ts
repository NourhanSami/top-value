import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const bankAccountSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  iban: z.string().optional(),
  balance: z.number().default(0),
  currency: z.string().default('EGP'),
  notes: z.string().optional(),
});

export const getAllBankAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const where: any = { isActive: true };
    if (search) {
      const q = search as string;
      where.OR = [
        { name: { contains: q } },
        { bankName: { contains: q } },
        { accountNumber: { contains: q } },
        { iban: { contains: q } },
      ];
    }
    const accounts = await prisma.bankAccount.findMany({ where, orderBy: { createdAt: 'asc' } });
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    res.json({ success: true, data: accounts, total_balance: totalBalance });
  } catch (error) { next(error); }
};

export const createBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = bankAccountSchema.parse(req.body);
    const account = await prisma.bankAccount.create({ data: validated });
    res.status(201).json({ success: true, message: 'تم إضافة الحساب البنكي', data: account });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    next(error);
  }
};

export const updateBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = bankAccountSchema.partial().parse(req.body);
    const account = await prisma.bankAccount.update({ where: { id: parseInt(id) }, data: validated });
    res.json({ success: true, message: 'تم تحديث الحساب البنكي', data: account });
  } catch (error) { next(error); }
};

export const deleteBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.bankAccount.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف الحساب البنكي' });
  } catch (error) { next(error); }
};
