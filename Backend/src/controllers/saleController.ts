import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const createSaleSchema = z.object({
  customerId: z.number().int().optional(),
  branchId: z.number().int(),
  saleDate: z.string().datetime().optional(),
  items: z.array(z.object({
    productId: z.number().int(),
    quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر'),
    unitPrice: z.number().nonnegative(),
    discountRate: z.number().min(0).max(100).default(0),
    taxRate: z.number().min(0).max(100).default(0)
  })).min(1, 'يجب إضافة منتج واحد على الأقل'),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  changeAmount: z.number().nonnegative().default(0),
  paymentMethod: z.enum(['cash', 'credit', 'card', 'transfer', 'mixed']).default('cash'),
  loyaltyPointsUsed: z.number().int().nonnegative().default(0),
  notes: z.string().optional()
});

// Generate unique invoice number
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const prefix = `INV-${year}${month}${day}`;

  // Get count of today's invoices
  const count = await prisma.sale.count({
    where: {
      invoiceNumber: {
        startsWith: prefix
      }
    }
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${sequence}`;
}

/**
 * @route   GET /api/sales
 * @desc    Get all sales with filters
 * @access  Private
 */
export const getAllSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      customerId,
      branchId,
      userId,
      status,
      paymentMethod,
      paymentStatus,
      dateFrom,
      dateTo,
      sortBy = 'saleDate',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { deletedAt: null };

    if (search) {
      where.invoiceNumber = { contains: search as string };
    }

    if (customerId) {
      where.customerId = parseInt(customerId as string);
    }

    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }

    if (userId) {
      where.userId = parseInt(userId as string);
    }

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      where.saleDate = {};
      if (dateFrom) {
        where.saleDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.saleDate.lte = new Date(dateTo as string);
      }
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, customerTier: true }
          },
          branch: {
            select: { id: true, name: true }
          },
          user: {
            select: { id: true, name: true, email: true }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, barcode: true }
              }
            }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.sale.count({ where })
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sales/statistics
 * @desc    Get sales statistics
 * @access  Private
 */
export const getSalesStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'today', branchId } = req.query;

    const now = new Date();
    let startDate: Date;
    let endDate: Date | undefined;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const baseWhere: any = {
      saleDate: endDate ? { gte: startDate, lt: endDate } : { gte: startDate },
      deletedAt: null
    };
    if (branchId) {
      baseWhere.branchId = parseInt(branchId as string);
    }

    const completedWhere = { ...baseWhere, status: 'completed' };

    const [salesStats, completedCount, pendingCount, cancelledCount, previousPeriodStats, paymentBreakdown] = await Promise.all([
      prisma.sale.aggregate({
        where: completedWhere,
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
        _avg: { totalAmount: true }
      }),
      prisma.sale.count({ where: { ...baseWhere, status: 'completed' } }),
      prisma.sale.count({ where: { ...baseWhere, status: 'pending' } }),
      prisma.sale.count({ where: { ...baseWhere, status: 'cancelled' } }),
      prisma.sale.aggregate({
        where: {
          ...completedWhere,
          saleDate: {
            gte: new Date(startDate.getTime() - (Date.now() - startDate.getTime())),
            lt: startDate
          }
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: completedWhere,
        _sum: { totalAmount: true },
        _count: true
      })
    ]);

    const totalSales = salesStats._sum.totalAmount || 0;
    const previousTotal = previousPeriodStats._sum.totalAmount || 0;
    const totalNum = typeof totalSales === 'object' && 'toNumber' in totalSales ? totalSales.toNumber() : Number(totalSales);
    const prevNum = typeof previousTotal === 'object' && 'toNumber' in previousTotal ? previousTotal.toNumber() : Number(previousTotal);
    const salesChange = prevNum > 0
      ? ((totalNum - prevNum) / prevNum) * 100
      : 0;

    const byPaymentMethod: Record<string, number> = {};
    for (const row of paymentBreakdown) {
      const amt = row._sum.totalAmount;
      byPaymentMethod[row.paymentMethod] =
        typeof amt === 'object' && amt && 'toNumber' in amt ? (amt as any).toNumber() : Number(amt || 0);
    }

    res.json({
      success: true,
      data: {
        period,
        totalSales: totalNum,
        totalOrders: salesStats._count,
        completedCount,
        pendingCount,
        cancelledCount,
        averageOrderValue: salesStats._avg.totalAmount
          ? (typeof salesStats._avg.totalAmount === 'object' && 'toNumber' in salesStats._avg.totalAmount
              ? salesStats._avg.totalAmount.toNumber()
              : Number(salesStats._avg.totalAmount))
          : 0,
        totalPaid: salesStats._sum.paidAmount || 0,
        salesChange: parseFloat(salesChange.toFixed(2)),
        ordersChange: previousPeriodStats._count > 0
          ? ((salesStats._count - previousPeriodStats._count) / previousPeriodStats._count) * 100
          : 0,
        byPaymentMethod,
        cashSales: byPaymentMethod.cash || 0,
        cardSales: byPaymentMethod.card || 0,
        creditSales: byPaymentMethod.credit || 0,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID
 * @access  Private
 */
export const getSaleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        branch: true,
        user: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/sales
 * @desc    Create new sale (POS transaction)
 * @access  Private
 */
export const createSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createSaleSchema.parse(req.body);
    const userId = (req as any).user.id;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Validate stock availability for all items
      for (const item of validatedData.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`المنتج رقم ${item.productId} غير موجود`);
        }

        if (product.trackInventory && product.stockQuantity < item.quantity) {
          throw new Error(`المنتج "${product.name}" غير متوفر بالكمية المطلوبة. المتوفر: ${product.stockQuantity}`);
        }
      }

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // Calculate payment status
      let paymentStatus = 'paid';
      if (validatedData.paidAmount < validatedData.totalAmount) {
        paymentStatus = validatedData.paidAmount > 0 ? 'partial' : 'unpaid';
      }

      // Calculate loyalty points earned (1 point per 10 EGP)
      const loyaltyPointsEarned = Math.floor(validatedData.totalAmount / 10);

      // Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: validatedData.customerId,
          branchId: validatedData.branchId,
          userId,
          saleDate: validatedData.saleDate ? new Date(validatedData.saleDate) : new Date(),
          status: 'completed',
          subtotal: validatedData.subtotal,
          taxAmount: validatedData.taxAmount,
          discountAmount: validatedData.discountAmount,
          totalAmount: validatedData.totalAmount,
          paidAmount: validatedData.paidAmount,
          changeAmount: validatedData.changeAmount,
          paymentMethod: validatedData.paymentMethod,
          paymentStatus,
          loyaltyPointsEarned,
          loyaltyPointsUsed: validatedData.loyaltyPointsUsed,
          notes: validatedData.notes
        },
        include: {
          customer: true,
          branch: true,
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Create sale items and update stock
      for (const item of validatedData.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        // Calculate item amounts
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemDiscountAmount = itemSubtotal * (item.discountRate / 100);
        const itemTaxableAmount = itemSubtotal - itemDiscountAmount;
        const itemTaxAmount = itemTaxableAmount * (item.taxRate / 100);
        const itemTotalAmount = itemTaxableAmount + itemTaxAmount;

        // Create sale item
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: product?.costPrice || 0,
            taxRate: item.taxRate,
            taxAmount: itemTaxAmount,
            discountRate: item.discountRate,
            discountAmount: itemDiscountAmount,
            totalAmount: itemTotalAmount
          }
        });

        // Update product stock if tracking is enabled
        if (product && product.trackInventory) {
          const newStock = product.stockQuantity - item.quantity;
          
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newStock }
          });

          // Create inventory transaction
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              branchId: validatedData.branchId,
              userId,
              transactionType: 'sale',
              quantity: -item.quantity,
              quantityBefore: product.stockQuantity,
              quantityAfter: newStock,
              unitCost: product.costPrice,
              referenceType: 'Sale',
              referenceId: sale.id,
              transactionDate: new Date(),
              notes: `بيع - فاتورة رقم ${invoiceNumber}`
            }
          });
        }
      }

      // Update customer balance if payment method is credit
      if (validatedData.customerId && validatedData.paymentMethod === 'credit') {
        const remainingAmount = validatedData.totalAmount - validatedData.paidAmount;
        
        await tx.customer.update({
          where: { id: validatedData.customerId },
          data: {
            currentBalance: { increment: remainingAmount }
          }
        });
      }

      // Update customer loyalty points
      if (validatedData.customerId) {
        await tx.customer.update({
          where: { id: validatedData.customerId },
          data: {
            loyaltyPoints: {
              increment: loyaltyPointsEarned,
              decrement: validatedData.loyaltyPointsUsed
            }
          }
        });
      }

      return sale;
    });

    try {
      const { logActivity, metaFromReq } = await import('../services/activityLogService');
      await logActivity({
        userId: (req as any).user?.id,
        action: 'sale',
        entityType: 'Sale',
        entityId: result.id,
        description: `عملية بيع — فاتورة ${result.invoiceNumber} بمبلغ ${Number(result.totalAmount)}`,
        newValues: { invoiceNumber: result.invoiceNumber, totalAmount: Number(result.totalAmount) },
        ...metaFromReq(req),
      });
    } catch { /* ignore */ }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفاتورة بنجاح',
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod Validation Error:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: error.errors
      });
    }
    if (error instanceof Error) {
      console.error('Sale Error:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    console.error('Unknown Error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/sales/invoice/:invoiceNumber
 * @desc    Get sale by invoice number
 * @access  Private
 */
export const getSaleByInvoiceNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invoiceNumber } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { invoiceNumber },
      include: {
        customer: true,
        branch: true,
        user: {
          select: { id: true, name: true, email: true }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};
