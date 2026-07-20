import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const CAPITAL_KEY = 'capital_initialization';

const initializeSchema = z.object({
  cashAmount: z.number().nonnegative(),
  notes: z.string().optional(),
});

async function calcAssets() {
  const [products, customers, suppliers, banks] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { stockQuantity: true, costPrice: true },
    }),
    prisma.customer.aggregate({
      where: { deletedAt: null },
      _sum: { currentBalance: true },
    }),
    prisma.supplier.aggregate({
      where: { deletedAt: null },
      _sum: { currentBalance: true },
    }),
    prisma.bankAccount.aggregate({
      where: { isActive: true },
      _sum: { balance: true },
    }),
  ]);

  const inventoryValue = products.reduce(
    (sum, p) => sum + Number(p.stockQuantity || 0) * Number(p.costPrice || 0),
    0
  );
  const customerDebts = Number(customers._sum.currentBalance || 0);
  const supplierDebts = Number(suppliers._sum.currentBalance || 0);
  const bankBalance = Number(banks._sum.balance || 0);

  return { inventoryValue, customerDebts, supplierDebts, bankBalance };
}

export const getCapitalSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: CAPITAL_KEY } });
    const assets = await calcAssets();

    if (!setting?.value) {
      return res.json({
        success: true,
        data: {
          initialized: false,
          preview: {
            inventoryValue: assets.inventoryValue,
            customerDebts: assets.customerDebts,
            supplierDebts: assets.supplierDebts,
            bankBalance: assets.bankBalance,
            netDebt: assets.customerDebts - assets.supplierDebts,
          },
        },
      });
    }

    const init = JSON.parse(setting.value);
    const currentCash = Number(init.cashAmount || 0) + assets.bankBalance;
    const currentAssets =
      assets.inventoryValue + currentCash + (assets.customerDebts - assets.supplierDebts);
    const startingCapital = Number(init.startingCapital || 0);
    const profitLoss = currentAssets - startingCapital;

    res.json({
      success: true,
      data: {
        initialized: true,
        startingCapital,
        initializationDate: init.initializationDate,
        notes: init.notes || null,
        current: {
          inventoryValue: assets.inventoryValue,
          cashAmount: Number(init.cashAmount || 0),
          bankBalance: assets.bankBalance,
          customerDebts: assets.customerDebts,
          supplierDebts: assets.supplierDebts,
          currentAssets,
          profitLoss,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const initializeCapital = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = initializeSchema.parse(req.body);
    const existing = await prisma.systemSetting.findUnique({ where: { key: CAPITAL_KEY } });
    if (existing?.value) {
      return res.status(400).json({
        success: false,
        message: 'تم تهيئة رأس المال مسبقاً',
      });
    }

    const assets = await calcAssets();
    const startingCapital =
      assets.inventoryValue +
      validated.cashAmount +
      (assets.customerDebts - assets.supplierDebts);

    const payload = {
      cashAmount: validated.cashAmount,
      inventoryValue: assets.inventoryValue,
      customerDebts: assets.customerDebts,
      supplierDebts: assets.supplierDebts,
      startingCapital,
      initializationDate: new Date().toISOString(),
      notes: validated.notes || null,
      initializedBy: (req as any).user?.id || null,
    };

    await prisma.systemSetting.create({
      data: {
        key: CAPITAL_KEY,
        value: JSON.stringify(payload),
        type: 'json',
        group: 'finance',
        description: 'تهيئة رأس المال الابتدائي',
      },
    });

    res.status(201).json({
      success: true,
      message: 'تم تهيئة رأس المال بنجاح',
      data: payload,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: error.errors,
      });
    }
    next(error);
  }
};
