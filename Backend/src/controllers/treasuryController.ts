import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const openSchema = z.object({
  branchId: z.number().int().positive(),
  openingCash: z.number().nonnegative().default(0),
  openingNetwork: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

const closeSchema = z.object({
  countedCash: z.number().nonnegative(),
  countedNetwork: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

async function calcSessionExpected(session: {
  id: number;
  branchId: number;
  openedAt: Date;
  closedAt: Date | null;
  openingCash: any;
  openingNetwork: any;
}) {
  const to = session.closedAt || new Date();
  const sales = await prisma.sale.findMany({
    where: {
      branchId: session.branchId,
      deletedAt: null,
      status: 'completed',
      saleDate: { gte: session.openedAt, lte: to },
    },
    select: {
      paymentMethod: true,
      paidAmount: true,
      cashAmount: true,
      cardAmount: true,
      totalAmount: true,
    },
  });

  let salesCash = 0;
  let salesNetwork = 0;
  for (const s of sales) {
    const cash = Number(s.cashAmount || 0);
    const card = Number(s.cardAmount || 0);
    if (cash > 0 || card > 0) {
      salesCash += cash;
      salesNetwork += card;
    } else if (s.paymentMethod === 'cash') {
      salesCash += Number(s.paidAmount || s.totalAmount || 0);
    } else if (s.paymentMethod === 'card' || s.paymentMethod === 'transfer') {
      salesNetwork += Number(s.paidAmount || s.totalAmount || 0);
    } else if (s.paymentMethod === 'split' || s.paymentMethod === 'mixed') {
      // fallback split unknown → count paid as cash
      salesCash += Number(s.paidAmount || 0);
    }
  }

  // Cash receipts vouchers in period
  const vouchers = await prisma.paymentVoucher.findMany({
    where: {
      branchId: session.branchId,
      voucherDate: { gte: session.openedAt, lte: to },
    },
    select: { voucherType: true, paymentMethod: true, amount: true },
  });

  let voucherCashIn = 0;
  let voucherNetworkIn = 0;
  let voucherCashOut = 0;
  let voucherNetworkOut = 0;
  for (const v of vouchers) {
    const amt = Number(v.amount || 0);
    const isIn = v.voucherType === 'receipt' || v.voucherType === 'in';
    const isCash = v.paymentMethod === 'cash';
    if (isIn) {
      if (isCash) voucherCashIn += amt;
      else voucherNetworkIn += amt;
    } else {
      if (isCash) voucherCashOut += amt;
      else voucherNetworkOut += amt;
    }
  }

  // Expenses paid in period
  const expenses = await prisma.expense.findMany({
    where: {
      branchId: session.branchId,
      status: { not: 'rejected' },
      expenseDate: { gte: session.openedAt, lte: to },
    },
    select: { amount: true, paymentMethod: true },
  });
  let expenseCash = 0;
  let expenseNetwork = 0;
  for (const e of expenses) {
    const amt = Number(e.amount || 0);
    if (e.paymentMethod === 'cash') expenseCash += amt;
    else expenseNetwork += amt;
  }

  const expectedCash =
    Number(session.openingCash || 0) + salesCash + voucherCashIn - voucherCashOut - expenseCash;
  const expectedNetwork =
    Number(session.openingNetwork || 0) + salesNetwork + voucherNetworkIn - voucherNetworkOut - expenseNetwork;

  return {
    expectedCash,
    expectedNetwork,
    breakdown: {
      salesCash,
      salesNetwork,
      voucherCashIn,
      voucherNetworkIn,
      voucherCashOut,
      voucherNetworkOut,
      expenseCash,
      expenseNetwork,
      salesCount: sales.length,
    },
  };
}

async function getBankBalance() {
  const banks = await prisma.bankAccount.aggregate({
    where: { isActive: true },
    _sum: { balance: true },
  });
  return Number(banks._sum.balance || 0);
}

async function getLastClosedCash(branchId: number) {
  const last = await prisma.cashSession.findFirst({
    where: { branchId, status: 'closed' },
    orderBy: { closedAt: 'desc' },
  });
  if (!last) return { cash: 0, network: 0 };
  return {
    cash: Number(last.countedCash ?? last.expectedCash ?? 0),
    network: Number(last.countedNetwork ?? last.expectedNetwork ?? 0),
  };
}

export const getTreasuryOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = parseInt(String(req.query.branchId || req.user?.branchId || '1'), 10);
    const openSession = await prisma.cashSession.findFirst({
      where: { branchId, status: 'open' },
      include: {
        openedBy: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    let sessionPayload: any = null;
    let cashBalance = 0;
    let networkBalance = 0;

    if (openSession) {
      const { expectedCash, expectedNetwork, breakdown } = await calcSessionExpected(openSession);
      sessionPayload = {
        ...openSession,
        expectedCash,
        expectedNetwork,
        breakdown,
      };
      cashBalance = expectedCash;
      networkBalance = expectedNetwork;
    } else {
      const last = await getLastClosedCash(branchId);
      cashBalance = last.cash;
      networkBalance = last.network;
    }

    const bankBalance = await getBankBalance();
    const [customers, suppliers] = await Promise.all([
      prisma.customer.aggregate({ where: { deletedAt: null }, _sum: { currentBalance: true } }),
      prisma.supplier.aggregate({ where: { deletedAt: null }, _sum: { currentBalance: true } }),
    ]);
    const customerDebts = Math.max(0, Number(customers._sum.currentBalance || 0));
    const supplierDebts = Math.max(0, Number(suppliers._sum.currentBalance || 0));
    const totalLiquidity = cashBalance + bankBalance;
    // قدرة الشراء = السيولة (كاش+بنك) ناقص مستحقات الموردين الموجبة
    const availableForPurchase = Math.max(0, totalLiquidity - supplierDebts);

    res.json({
      success: true,
      data: {
        branchId,
        openSession: sessionPayload,
        liquidity: {
          cashBalance,
          networkBalance,
          bankBalance,
          totalLiquidity,
          customerDebts,
          supplierDebts,
          netReceivables: customerDebts - supplierDebts,
          availableForPurchase,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const openCashSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = openSchema.parse(req.body);
    const userId = req.user!.id;

    const existing = await prisma.cashSession.findFirst({
      where: { branchId: validated.branchId, status: 'open' },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'يوجد جلسة خزنة مفتوحة بالفعل لهذا الفرع',
        data: existing,
      });
    }

    const last = await getLastClosedCash(validated.branchId);
    const openingCash = validated.openingCash ?? last.cash;
    const openingNetwork = validated.openingNetwork ?? last.network;

    const session = await prisma.cashSession.create({
      data: {
        branchId: validated.branchId,
        openedById: userId,
        status: 'open',
        openedAt: new Date(),
        openingCash,
        openingNetwork,
        expectedCash: openingCash,
        expectedNetwork: openingNetwork,
        notes: validated.notes || null,
      },
      include: {
        openedBy: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, message: 'تم فتح جلسة الخزنة', data: session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    }
    next(error);
  }
};

export const closeCashSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const validated = closeSchema.parse(req.body);
    const userId = req.user!.id;

    const session = await prisma.cashSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    if (session.status !== 'open') {
      return res.status(400).json({ success: false, message: 'الجلسة مغلقة مسبقاً' });
    }

    const { expectedCash, expectedNetwork, breakdown } = await calcSessionExpected(session);
    const cashDeficit = expectedCash - validated.countedCash; // + = عجز
    const networkDeficit = expectedNetwork - validated.countedNetwork;

    const updated = await prisma.cashSession.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedById: userId,
        expectedCash,
        expectedNetwork,
        countedCash: validated.countedCash,
        countedNetwork: validated.countedNetwork,
        cashDeficit,
        networkDeficit,
        notes: validated.notes || session.notes,
      },
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      message: 'تم إغلاق جلسة الخزنة',
      data: { ...updated, breakdown },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    }
    next(error);
  }
};

export const listCashSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : undefined;
    const limit = parseInt(String(req.query.limit || '20'));
    const sessions = await prisma.cashSession.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: limit,
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

export const checkPurchaseCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amount = Number(req.body.amount ?? req.query.amount);
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'أدخل مبلغاً صحيحاً' });
    }
    const branchId = parseInt(String(req.body.branchId || req.query.branchId || req.user?.branchId || '1'), 10);

    const openSession = await prisma.cashSession.findFirst({
      where: { branchId, status: 'open' },
      orderBy: { openedAt: 'desc' },
    });

    let cashBalance = 0;
    if (openSession) {
      const { expectedCash } = await calcSessionExpected(openSession);
      cashBalance = expectedCash;
    } else {
      cashBalance = (await getLastClosedCash(branchId)).cash;
    }

    const bankBalance = await getBankBalance();
    const suppliers = await prisma.supplier.aggregate({
      where: { deletedAt: null },
      _sum: { currentBalance: true },
    });
    const supplierDebts = Math.max(0, Number(suppliers._sum.currentBalance || 0));
    const totalLiquidity = cashBalance + bankBalance;
    const availableForPurchase = Math.max(0, totalLiquidity - supplierDebts);
    const canAfford = availableForPurchase >= amount;
    const shortfall = canAfford ? 0 : amount - availableForPurchase;

    res.json({
      success: true,
      data: {
        amount,
        cashBalance,
        bankBalance,
        totalLiquidity,
        supplierDebts,
        availableForPurchase,
        canAfford,
        shortfall,
        message: canAfford
          ? `نعم، لديك سيولة كافية لشراء بقيمة ${amount}`
          : `لا، ينقصك ${shortfall.toFixed(2)} لإتمام الشراء`,
      },
    });
  } catch (error) {
    next(error);
  }
};
