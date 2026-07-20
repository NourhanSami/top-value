import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const createPurchaseOrderSchema = z.object({
  supplierId: z.number().int(),
  branchId: z.number().int(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int(),
    quantityOrdered: z.number().int().positive(),
    unitCost: z.number().nonnegative(),
    taxRate: z.number().min(0).max(100).default(0),
    discountRate: z.number().min(0).max(100).default(0)
  })).min(1),
  shippingCost: z.number().nonnegative().default(0),
  notes: z.string().optional()
});

// Generate unique order number
async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const prefix = `PO-${year}${month}${day}`;

  const count = await prisma.purchaseOrder.count({
    where: {
      orderNumber: {
        startsWith: prefix
      }
    }
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${sequence}`;
}

/**
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders
 * @access  Private
 */
export const getAllPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      supplierId,
      branchId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string } },
        { supplier: { name: { contains: search as string } } },
        { notes: { contains: search as string } },
      ];
    }

    if (supplierId) {
      where.supplierId = parseInt(supplierId as string);
    }

    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) {
        where.orderDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.orderDate.lte = new Date(dateTo as string);
      }
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, phone: true }
          },
          branch: {
            select: { id: true, name: true }
          },
          user: {
            select: { id: true, name: true }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true }
              }
            }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.purchaseOrder.count({ where })
    ]);

    res.json({
      success: true,
      data: orders,
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
 * @route   GET /api/purchase-orders/statistics
 * @desc    Get purchase order statistics
 * @access  Private
 */
export const getPurchaseOrderStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.query;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseWhere: any = { deletedAt: null };
    if (branchId) baseWhere.branchId = parseInt(branchId as string);

    const [total, pending, received, ordered, cancelled, monthAgg, allStatusCounts] = await Promise.all([
      prisma.purchaseOrder.count({ where: baseWhere }),
      prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'pending' } }),
      prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'received' } }),
      prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'ordered' } }),
      prisma.purchaseOrder.count({ where: { ...baseWhere, status: 'cancelled' } }),
      prisma.purchaseOrder.aggregate({
        where: { ...baseWhere, orderDate: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.purchaseOrder.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
    ]);

    const thisMonthTotal = monthAgg._sum.totalAmount
      ? (typeof monthAgg._sum.totalAmount === 'object' && 'toNumber' in monthAgg._sum.totalAmount
          ? monthAgg._sum.totalAmount.toNumber()
          : Number(monthAgg._sum.totalAmount))
      : 0;

    res.json({
      success: true,
      data: {
        total,
        pending,
        received,
        ordered,
        cancelled,
        this_month_total: thisMonthTotal,
        this_month_count: monthAgg._count,
        statusBreakdown: allStatusCounts.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID
 * @access  Private
 */
export const getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        supplier: true,
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

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'أمر الشراء غير موجود'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/purchase-orders
 * @desc    Create new purchase order
 * @access  Private
 */
export const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createPurchaseOrderSchema.parse(req.body);
    const userId = (req as any).user.id;

    const result = await prisma.$transaction(async (tx) => {
      // Generate order number
      const orderNumber = await generateOrderNumber();

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      const itemsData = validatedData.items.map(item => {
        const itemSubtotal = item.unitCost * item.quantityOrdered;
        const itemDiscount = itemSubtotal * (item.discountRate / 100);
        const itemTaxableAmount = itemSubtotal - itemDiscount;
        const itemTax = itemTaxableAmount * (item.taxRate / 100);
        const itemTotal = itemTaxableAmount + itemTax;

        subtotal += itemSubtotal;
        totalTax += itemTax;
        totalDiscount += itemDiscount;

        return {
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: 0,
          unitCost: item.unitCost,
          taxRate: item.taxRate,
          taxAmount: itemTax,
          discountRate: item.discountRate,
          discountAmount: itemDiscount,
          totalAmount: itemTotal
        };
      });

      const totalAmount = subtotal - totalDiscount + totalTax + validatedData.shippingCost;

      // Create purchase order
      const order = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: validatedData.supplierId,
          branchId: validatedData.branchId,
          userId,
          orderDate: validatedData.orderDate ? new Date(validatedData.orderDate) : new Date(),
          expectedDeliveryDate: validatedData.expectedDeliveryDate ? new Date(validatedData.expectedDeliveryDate) : undefined,
          status: 'pending',
          subtotal,
          taxAmount: totalTax,
          discountAmount: totalDiscount,
          shippingCost: validatedData.shippingCost,
          totalAmount,
          paidAmount: 0,
          paymentStatus: 'unpaid',
          notes: validatedData.notes,
          items: {
            create: itemsData
          }
        },
        include: {
          supplier: true,
          branch: true,
          user: {
            select: { id: true, name: true }
          },
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return order;
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء أمر الشراء بنجاح',
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صحيحة',
        errors: error.errors
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/purchase-orders/:id/receive
 * @desc    Receive purchase order items (update stock)
 * @access  Private
 */
export const receivePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { items, receivedDate, notes } = req.body;
    const userId = (req as any).user.id;

    const result = await prisma.$transaction(async (tx) => {
      // Get order
      const order = await tx.purchaseOrder.findUnique({
        where: { id: parseInt(id) },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!order) {
        throw new Error('أمر الشراء غير موجود');
      }

      if (order.status === 'received') {
        throw new Error('تم استلام هذا الأمر مسبقاً');
      }

      // Update items and stock
      for (const receivedItem of items) {
        const orderItem = order.items.find(i => i.id === receivedItem.itemId);
        
        if (!orderItem) {
          throw new Error(`العنصر رقم ${receivedItem.itemId} غير موجود في الأمر`);
        }

        // Update order item
        await tx.purchaseOrderItem.update({
          where: { id: receivedItem.itemId },
          data: {
            quantityReceived: receivedItem.quantityReceived
          }
        });

        // Update product stock
        const newStock = orderItem.product.stockQuantity + receivedItem.quantityReceived;
        
        await tx.product.update({
          where: { id: orderItem.productId },
          data: { stockQuantity: newStock }
        });

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: orderItem.productId,
            branchId: order.branchId,
            userId,
            transactionType: 'purchase',
            quantity: receivedItem.quantityReceived,
            quantityBefore: orderItem.product.stockQuantity,
            quantityAfter: newStock,
            unitCost: orderItem.unitCost,
            referenceType: 'PurchaseOrder',
            referenceId: order.id,
            transactionDate: receivedDate ? new Date(receivedDate) : new Date(),
            notes: `استلام شراء - طلب رقم ${order.orderNumber}`
          }
        });
      }

      // Check if all items received
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: parseInt(id) }
      });

      const allReceived = updatedItems.every(item => item.quantityReceived >= item.quantityOrdered);
      const partiallyReceived = updatedItems.some(item => item.quantityReceived > 0);

      // Update order status
      const newStatus = allReceived ? 'received' : (partiallyReceived ? 'partial' : 'pending');

      // عند الاستلام الكامل لأول مرة: زيادة رصيد المورد المستحق
      if (newStatus === 'received' && order.status !== 'received') {
        const unpaid = Number(order.totalAmount) - Number(order.paidAmount);
        if (unpaid > 0) {
          await tx.supplier.update({
            where: { id: order.supplierId },
            data: { currentBalance: { increment: unpaid } }
          });
        }
      }

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: parseInt(id) },
        data: {
          status: newStatus,
          receivedDate: allReceived ? (receivedDate ? new Date(receivedDate) : new Date()) : undefined
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return updatedOrder;
    });

    res.json({
      success: true,
      message: 'تم استلام الأصناف بنجاح',
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/purchase-orders/:id/status
 * @desc    Update purchase order status
 * @access  Private
 */
export const updatePurchaseOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة غير صحيحة'
      });
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing || existing.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'أمر الشراء غير موجود'
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      // عند الاستلام: زيادة رصيد المورد بالمبلغ غير المدفوع (ما علينا للمورد)
      if (status === 'received' && existing.status !== 'received') {
        const unpaid = Number(existing.totalAmount) - Number(existing.paidAmount);
        if (unpaid > 0) {
          await tx.supplier.update({
            where: { id: existing.supplierId },
            data: { currentBalance: { increment: unpaid } }
          });
        }
      }

      // لو اتلغى طلب كان مستلم: نرجّع الرصيد
      if (status === 'cancelled' && existing.status === 'received') {
        const unpaid = Number(existing.totalAmount) - Number(existing.paidAmount);
        if (unpaid > 0) {
          await tx.supplier.update({
            where: { id: existing.supplierId },
            data: { currentBalance: { decrement: unpaid } }
          });
        }
      }

      return tx.purchaseOrder.update({
        where: { id: parseInt(id) },
        data: {
          status,
          ...(status === 'received' && !existing.receivedDate
            ? { receivedDate: new Date() }
            : {}),
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/purchase-orders/:id
 * @desc    Cancel/delete purchase order
 * @access  Private
 */
export const deletePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'أمر الشراء غير موجود'
      });
    }

    if (order.status === 'received') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف طلب تم استلامه'
      });
    }

    await prisma.purchaseOrder.update({
      where: { id: parseInt(id) },
      data: {
        status: 'cancelled',
        deletedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'تم إلغاء أمر الشراء بنجاح'
    });
  } catch (error) {
    next(error);
  }
};
