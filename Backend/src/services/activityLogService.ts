import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export type LogActivityInput = {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  description: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logActivity(input: LogActivityInput) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description,
        oldValues: input.oldValues ?? undefined,
        newValues: input.newValues ?? undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
    return null;
  }
}

export function metaFromReq(req: Request) {
  return {
    ipAddress: (req.ip || req.socket?.remoteAddress || null) as string | null,
    userAgent: (req.headers['user-agent'] as string) || null,
  };
}

/** Seed logs from existing sales if the activity table is empty */
let backfillPromise: Promise<{ created: number }> | null = null;

export async function backfillActivityLogsIfEmpty() {
  if (backfillPromise) return backfillPromise;

  backfillPromise = (async () => {
    const count = await prisma.activityLog.count();
    if (count > 0) return { created: 0 };

    const sales = await prisma.sale.findMany({
      where: { deletedAt: null },
      orderBy: { saleDate: 'desc' },
      take: 50,
      include: { customer: { select: { name: true } } },
    });

    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { expenseDate: 'desc' },
      take: 20,
    });

    const orders = await prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { supplier: { select: { name: true } } },
    });

    let created = 0;
    for (const s of sales) {
      await prisma.activityLog.create({
        data: {
          userId: s.userId,
          action: 'sale',
          entityType: 'Sale',
          entityId: s.id,
          description: `عملية بيع — فاتورة ${s.invoiceNumber}${s.customer ? ` للعميل ${s.customer.name}` : ''} بمبلغ ${Number(s.totalAmount)}`,
          newValues: { invoiceNumber: s.invoiceNumber, totalAmount: Number(s.totalAmount), paymentMethod: s.paymentMethod },
          createdAt: s.saleDate,
        },
      });
      created++;
    }
    for (const e of expenses) {
      await prisma.activityLog.create({
        data: {
          userId: e.userId,
          action: 'create',
          entityType: 'Expense',
          entityId: e.id,
          description: `إضافة مصروف — ${e.title} بمبلغ ${Number(e.amount)}`,
          newValues: { title: e.title, amount: Number(e.amount) },
          createdAt: e.expenseDate,
        },
      });
      created++;
    }
    for (const o of orders) {
      await prisma.activityLog.create({
        data: {
          userId: o.userId,
          action: o.status === 'received' ? 'purchase' : 'create',
          entityType: 'PurchaseOrder',
          entityId: o.id,
          description: `طلب شراء ${o.orderNumber}${o.supplier ? ` من ${o.supplier.name}` : ''} — الحالة: ${o.status}`,
          newValues: { orderNumber: o.orderNumber, totalAmount: Number(o.totalAmount), status: o.status },
          createdAt: o.createdAt,
        },
      });
      created++;
    }

    return { created };
  })();

  try {
    return await backfillPromise;
  } finally {
    // keep resolved promise so concurrent callers reuse result; reset if failed
  }
}
