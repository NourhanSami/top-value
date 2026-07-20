import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createSchema = z.object({
  driverId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  periodType: z.enum(['daily', 'weekly']).default('daily'),
  routeDate: z.string().min(1),
  weekEndDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    warehouseQty: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1),
});

const reconcileSchema = z.object({
  items: z.array(z.object({
    itemId: z.number().int().positive(),
    driverQty: z.number().int().nonnegative(),
    notes: z.string().optional(),
  })).min(1),
});

async function generateRouteNumber(): Promise<string> {
  const today = new Date();
  const prefix = `DRV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.driverRoute.count({ where: { routeNumber: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

function summarizeItems(items: Array<{ warehouseQty: number; driverQty: number | null; variance: number; isMatched: boolean }>) {
  const totalWarehouse = items.reduce((s, i) => s + i.warehouseQty, 0);
  const totalDriver = items.reduce((s, i) => s + (i.driverQty ?? 0), 0);
  const totalVariance = items.reduce((s, i) => s + i.variance, 0);
  const matchedCount = items.filter((i) => i.isMatched).length;
  const mismatchCount = items.length - matchedCount;
  return { totalWarehouse, totalDriver, totalVariance, matchedCount, mismatchCount, allMatched: mismatchCount === 0 && items.every((i) => i.driverQty != null) };
}

export const listDriverRoutes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, driverId, branchId, dateFrom, dateTo } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (driverId) where.driverId = parseInt(driverId as string);
    if (branchId) where.branchId = parseInt(branchId as string);
    if (dateFrom || dateTo) {
      where.routeDate = {};
      if (dateFrom) where.routeDate.gte = new Date(dateFrom as string);
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        where.routeDate.lte = to;
      }
    }

    const [routes, total] = await Promise.all([
      prisma.driverRoute.findMany({
        where,
        include: {
          driver: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        },
        orderBy: { routeDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.driverRoute.count({ where }),
    ]);

    res.json({
      success: true,
      data: routes.map((r) => ({
        ...r,
        summary: summarizeItems(r.items.map((i) => ({
          warehouseQty: i.warehouseQty,
          driverQty: i.driverQty,
          variance: i.variance,
          isMatched: i.isMatched,
        }))),
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const getDriverRouteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const route = await prisma.driverRoute.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, name: true, phone: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true, stockQuantity: true } } } },
      },
    });
    if (!route) return res.status(404).json({ success: false, message: 'خط السير غير موجود' });
    res.json({
      success: true,
      data: {
        ...route,
        summary: summarizeItems(route.items.map((i) => ({
          warehouseQty: i.warehouseQty,
          driverQty: i.driverQty,
          variance: i.variance,
          isMatched: i.isMatched,
        }))),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createDriverRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createSchema.parse(req.body);
    const userId = req.user!.id;

    const driver = await prisma.user.findFirst({ where: { id: validated.driverId, isActive: true, deletedAt: null } });
    if (!driver) return res.status(400).json({ success: false, message: 'السائق/الموظف غير موجود' });

    const routeDate = new Date(validated.routeDate);
    let weekEndDate: Date | null = null;
    if (validated.periodType === 'weekly') {
      weekEndDate = validated.weekEndDate
        ? new Date(validated.weekEndDate)
        : new Date(routeDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Validate stock
      for (const item of validated.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.deletedAt) throw new Error(`المنتج ${item.productId} غير موجود`);
        if (product.trackInventory && product.stockQuantity < item.warehouseQty) {
          throw new Error(`المخزون غير كافٍ للمنتج "${product.name}". المتوفر: ${product.stockQuantity}`);
        }
      }

      const routeNumber = await generateRouteNumber();
      const route = await tx.driverRoute.create({
        data: {
          routeNumber,
          driverId: validated.driverId,
          branchId: validated.branchId,
          createdById: userId,
          periodType: validated.periodType,
          routeDate,
          weekEndDate,
          status: 'draft',
          notes: validated.notes || null,
          items: {
            create: validated.items.map((i) => ({
              productId: i.productId,
              warehouseQty: i.warehouseQty,
              notes: i.notes || null,
            })),
          },
        },
        include: {
          driver: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });

      return route;
    });

    res.status(201).json({ success: true, message: 'تم إنشاء خط السير', data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    }
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

/** صرف الكميات من المخزن للسائق */
export const dispatchDriverRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.driverRoute.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!route) throw new Error('خط السير غير موجود');
      if (route.status !== 'draft') throw new Error('يمكن الصرف فقط من مسودة');

      for (const item of route.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`منتج غير موجود: ${item.productId}`);
        if (product.trackInventory) {
          if (product.stockQuantity < item.warehouseQty) {
            throw new Error(`المخزون غير كافٍ للمنتج "${product.name}"`);
          }
          const before = product.stockQuantity;
          const after = before - item.warehouseQty;
          await tx.product.update({ where: { id: product.id }, data: { stockQuantity: after } });
          await tx.inventoryTransaction.create({
            data: {
              productId: product.id,
              branchId: route.branchId,
              userId,
              transactionType: 'driver_dispatch',
              quantity: -item.warehouseQty,
              quantityBefore: before,
              quantityAfter: after,
              unitCost: product.costPrice,
              referenceType: 'DriverRoute',
              referenceId: route.id,
              transactionDate: new Date(),
              notes: `صرف لخط سير ${route.routeNumber}`,
            },
          });
        }
      }

      return tx.driverRoute.update({
        where: { id },
        data: { status: 'dispatched', dispatchedAt: new Date() },
        include: {
          driver: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });
    });

    res.json({ success: true, message: 'تم صرف الكميات من المخزن للسائق', data: result });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

/** الفيصل: مطابقة كمية المخزن مع كمية السائق */
export const reconcileDriverRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const validated = reconcileSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.driverRoute.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!route) throw new Error('خط السير غير موجود');
      if (route.status !== 'dispatched' && route.status !== 'reconciled') {
        throw new Error('يجب صرف خط السير من المخزن أولاً قبل الفيصل');
      }

      for (const row of validated.items) {
        const item = route.items.find((i) => i.id === row.itemId);
        if (!item) throw new Error(`بند غير موجود: ${row.itemId}`);
        const variance = item.warehouseQty - row.driverQty;
        await tx.driverRouteItem.update({
          where: { id: item.id },
          data: {
            driverQty: row.driverQty,
            variance,
            isMatched: variance === 0,
            notes: row.notes !== undefined ? row.notes : item.notes,
          },
        });
      }

      const updatedItems = await tx.driverRouteItem.findMany({ where: { routeId: id } });
      const allFilled = updatedItems.every((i) => i.driverQty != null);
      const allMatched = updatedItems.every((i) => i.isMatched);

      return tx.driverRoute.update({
        where: { id },
        data: {
          status: allFilled ? 'reconciled' : route.status,
          reconciledAt: allFilled ? new Date() : route.reconciledAt,
          notes: allMatched && allFilled
            ? (route.notes ? `${route.notes} | فيصل مطابق` : 'فيصل مطابق')
            : route.notes,
        },
        include: {
          driver: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        },
      });
    });

    const summary = summarizeItems(result.items.map((i) => ({
      warehouseQty: i.warehouseQty,
      driverQty: i.driverQty,
      variance: i.variance,
      isMatched: i.isMatched,
    })));

    res.json({
      success: true,
      message: summary.allMatched
        ? 'الفيصل مطابق — الكميات متطابقة'
        : `تم حفظ الفيصل — يوجد اختلاف في ${summary.mismatchCount} صنف`,
      data: { ...result, summary },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    }
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};

export const closeDriverRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const route = await prisma.driverRoute.findUnique({ where: { id }, include: { items: true } });
    if (!route) return res.status(404).json({ success: false, message: 'خط السير غير موجود' });
    if (route.status !== 'reconciled') {
      return res.status(400).json({ success: false, message: 'يجب إتمام الفيصل قبل الإغلاق' });
    }
    const updated = await prisma.driverRoute.update({
      where: { id },
      data: { status: 'closed' },
      include: {
        driver: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    res.json({ success: true, message: 'تم إغلاق خط السير', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteDriverRoute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const route = await prisma.driverRoute.findUnique({ where: { id } });
    if (!route) return res.status(404).json({ success: false, message: 'خط السير غير موجود' });
    if (route.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف خط سير تم صرفه' });
    }
    await prisma.driverRoute.delete({ where: { id } });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    next(error);
  }
};
