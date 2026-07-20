import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createQuotationSchema = z.object({
  customerId: z.number().int().optional(),
  branchId: z.number().int().positive(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    discountRate: z.number().min(0).max(100).default(0),
    taxRate: z.number().min(0).max(100).default(0),
  })).min(1),
});

async function generateQuotationNumber(): Promise<string> {
  const today = new Date();
  const prefix = `QUO-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const count = await prisma.quotation.count({ where: { quotationNumber: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export const getAllQuotations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, customerId, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (customerId) where.customerId = parseInt(customerId as string);
    if (search) where.quotationNumber = { contains: search as string };

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        orderBy: { quotationDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.quotation.count({ where }),
    ]);
    res.json({ success: true, data: quotations, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) { next(error); }
};

export const getQuotationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { customer: true, branch: true, user: { select: { id: true, name: true } }, items: { include: { product: true } } },
    });
    if (!q) return res.status(404).json({ success: false, message: 'عرض السعر غير موجود' });
    res.json({ success: true, data: q });
  } catch (error) { next(error); }
};

export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createQuotationSchema.parse(req.body);
    const userId = (req as any).user.id;

    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    const itemsData = validated.items.map(item => {
      const itemSub = item.unitPrice * item.quantity;
      const disc = itemSub * (item.discountRate / 100);
      const taxable = itemSub - disc;
      const tax = taxable * (item.taxRate / 100);
      subtotal += itemSub;
      discountAmount += disc;
      taxAmount += tax;
      return { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, discountRate: item.discountRate, taxRate: item.taxRate, totalAmount: taxable + tax };
    });
    const totalAmount = subtotal - discountAmount + taxAmount;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: await generateQuotationNumber(),
        customerId: validated.customerId,
        branchId: validated.branchId,
        userId,
        quotationDate: new Date(),
        validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
        status: 'draft',
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        notes: validated.notes,
        terms: validated.terms,
        items: { create: itemsData },
      },
      include: { customer: true, items: { include: { product: true } } },
    });
    res.status(201).json({ success: true, message: 'تم إنشاء عرض السعر', data: quotation });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, message: 'بيانات غير صحيحة', errors: error.errors });
    next(error);
  }
};

export const updateQuotationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const q = await prisma.quotation.update({ where: { id: parseInt(id) }, data: { status } });
    res.json({ success: true, message: 'تم تحديث حالة عرض السعر', data: q });
  } catch (error) { next(error); }
};

export const convertQuotationToSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { paidAmount, paymentMethod } = req.body;
    const userId = (req as any).user.id;
    const quotation = await prisma.quotation.findUnique({ where: { id: parseInt(id) }, include: { items: true } });
    if (!quotation) return res.status(404).json({ success: false, message: 'عرض السعر غير موجود' });
    if (quotation.convertedToSale) return res.status(400).json({ success: false, message: 'تم تحويل هذا العرض مسبقاً' });

    // Generate invoice number
    const today = new Date();
    const prefix = `INV-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const count = await prisma.sale.count({ where: { invoiceNumber: { startsWith: prefix } } });
    const invoiceNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: quotation.customerId,
          branchId: quotation.branchId,
          userId,
          saleDate: new Date(),
          status: 'completed',
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          discountAmount: quotation.discountAmount,
          totalAmount: quotation.totalAmount,
          paidAmount: paidAmount || quotation.totalAmount,
          changeAmount: 0,
          paymentMethod: paymentMethod || 'cash',
          paymentStatus: 'paid',
          items: { create: quotation.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, costPrice: 0, taxRate: i.taxRate, taxAmount: 0, discountRate: i.discountRate, discountAmount: 0, totalAmount: i.totalAmount })) },
        },
      });
      await tx.quotation.update({ where: { id: parseInt(id) }, data: { convertedToSale: true, saleId: sale.id, status: 'accepted' } });
      return sale;
    });

    res.json({ success: true, message: 'تم تحويل عرض السعر إلى فاتورة', data: result });
  } catch (error) { next(error); }
};

export const deleteQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.quotation.update({ where: { id: parseInt(req.params.id) }, data: { deletedAt: new Date() } });
    res.json({ success: true, message: 'تم حذف عرض السعر' });
  } catch (error) { next(error); }
};
