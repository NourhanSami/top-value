import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createTransferSchema = z.object({
  fromBranchId: z.number().int().positive(),
  toBranchId: z.number().int().positive(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
});

async function generateTransferNumber(): Promise<string> {
  const today = new Date();
  const prefix = `TRF-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const count = await prisma.inventoryTransfer.count({ where: { transferNumber: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export const getAllTransfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', fromBranchId, toBranchId, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = {};
    if (fromBranchId) where.fromBranchId = parseInt(fromBranchId as string);
    if (toBranchId) where.toBranchId = parseInt(toBranchId as string);
    if (search) {
      where.OR = [
        { transferNumber: { contains: search as string } },
        { notes: { contains: search as string } },
        { fromBranch: { name: { contains: search as string } } },
        { toBranch: { name: { contains: search as string } } },
      ];
    }

    const [transfers, total] = await Promise.all([
      prisma.inventoryTransfer.findMany({
        where,
        include: {
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        orderBy: { transferDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.inventoryTransfer.count({ where }),
    ]);
    res.json({ success: true, data: transfers, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) { next(error); }
};

export const createTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createTransferSchema.parse(req.body);
    const userId = (req as any).user.id;
    if (validated.fromBranchId === validated.toBranchId) return res.status(400).json({ success: false, message: 'الفرع المصدر والوجهة لا يمكن أن يكونا نفس الفرع' });

    const result = await prisma.$transaction(async (tx) => {
      // Check stock availability
      for (const item of validated.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`المنتج ${item.productId} غير موجود`);
        if (product.trackInventory && product.stockQuantity < item.quantity) throw new Error(`المنتج "${product.name}" لا يوجد مخزون كافٍ. المتاح: ${product.stockQuantity}`);
      }

      const transfer = await tx.inventoryTransfer.create({
        data: {
          transferNumber: await generateTransferNumber(),
          fromBranchId: validated.fromBranchId,
          toBranchId: validated.toBranchId,
          userId,
          transferDate: new Date(),
          status: 'completed',
          notes: validated.notes,
          items: { create: validated.items },
        },
      });

      // Deduct from source, add to destination
      for (const item of validated.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.trackInventory) continue;
        const newQty = product.stockQuantity - item.quantity;
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: newQty } });

        await tx.inventoryTransaction.create({
          data: { productId: item.productId, branchId: validated.fromBranchId, userId, transactionType: 'transfer_out', quantity: -item.quantity, quantityBefore: product.stockQuantity, quantityAfter: newQty, unitCost: product.costPrice, referenceType: 'InventoryTransfer', referenceId: transfer.id, transactionDate: new Date(), notes: `تحويل صادر - ${transfer.transferNumber}` },
        });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, branchId: validated.toBranchId, userId, transactionType: 'transfer_in', quantity: item.quantity, quantityBefore: newQty, quantityAfter: newQty + item.quantity, unitCost: product.costPrice, referenceType: 'InventoryTransfer', referenceId: transfer.id, transactionDate: new Date(), notes: `تحويل وارد - ${transfer.transferNumber}` },
        });
      }

      return transfer;
    });

    res.status(201).json({ success: true, message: 'تم تحويل المخزون بنجاح', data: result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    if (error instanceof Error) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};
