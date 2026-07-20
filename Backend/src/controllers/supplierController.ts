import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const supplierSchema = z.object({
  name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(100),
  companyName: z.string().optional(),
  taxNumber: z.string().optional(),
  phone: z.string().min(8, 'رقم الهاتف غير صحيح').max(20),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  creditLimit: z.number().nonnegative().default(0),
  isActive: z.boolean().default(true),
  notes: z.string().optional()
});

function cleanSupplierPayload(body: any) {
  const data = { ...body };
  if (data.email === '') delete data.email;
  if (data.address === '') delete data.address;
  if (data.city === '') delete data.city;
  if (data.companyName === '') delete data.companyName;
  if (data.notes === '') delete data.notes;
  return data;
}

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers
 * @access  Private
 */
export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      isActive,
      hasDebt,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { companyName: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (hasDebt === 'true') {
      where.currentBalance = { gt: 0 };
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: { products: true, purchaseOrders: true }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.supplier.count({ where })
    ]);

    res.json({
      success: true,
      data: suppliers,
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
 * @route   GET /api/suppliers/statistics
 * @desc    Get supplier statistics
 * @access  Private
 */
export const getSupplierStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, activeCount, debtStats, monthlyPurchases] = await Promise.all([
      prisma.supplier.count({ where: { deletedAt: null } }),
      prisma.supplier.count({ where: { isActive: true, deletedAt: null } }),
      prisma.supplier.aggregate({
        where: { currentBalance: { gt: 0 }, deletedAt: null },
        _sum: { currentBalance: true },
        _count: true
      }),
      prisma.purchaseOrder.aggregate({
        where: { orderDate: { gte: monthStart }, deletedAt: null, status: { not: 'cancelled' } },
        _sum: { totalAmount: true }
      })
    ]);

    const totalDebt = debtStats._sum.currentBalance
      ? (typeof debtStats._sum.currentBalance === 'object' && 'toNumber' in debtStats._sum.currentBalance
          ? debtStats._sum.currentBalance.toNumber()
          : Number(debtStats._sum.currentBalance))
      : 0;
    const monthly = monthlyPurchases._sum.totalAmount
      ? (typeof monthlyPurchases._sum.totalAmount === 'object' && 'toNumber' in monthlyPurchases._sum.totalAmount
          ? monthlyPurchases._sum.totalAmount.toNumber()
          : Number(monthlyPurchases._sum.totalAmount))
      : 0;

    res.json({
      success: true,
      data: {
        total,
        active: activeCount,
        suppliersWithDebt: debtStats._count,
        totalDebt,
        total_balance: totalDebt,
        monthly_purchases: monthly,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
export const getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) },
      include: {
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            sellingPrice: true,
            stockQuantity: true
          }
        },
        purchaseOrders: {
          take: 10,
          orderBy: { orderDate: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            totalAmount: true,
            status: true,
            paymentStatus: true
          }
        },
        _count: {
          select: { products: true, purchaseOrders: true }
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'المورد غير موجود'
      });
    }

    // Calculate total purchases
    const purchaseStats = await prisma.purchaseOrder.aggregate({
      where: {
        supplierId: parseInt(id),
        status: { in: ['completed', 'received'] }
      },
      _sum: { totalAmount: true },
      _count: true
    });

    const supplierWithStats = {
      ...supplier,
      totalPurchases: purchaseStats._sum.totalAmount || 0,
      totalOrders: purchaseStats._count
    };

    res.json({
      success: true,
      data: supplierWithStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private
 */
export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = supplierSchema.parse(cleanSupplierPayload(req.body));

    // Check if phone already exists
    const existing = await prisma.supplier.findFirst({
      where: {
        phone: validatedData.phone,
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مسجل مسبقاً'
      });
    }

    const supplier = await prisma.supplier.create({
      data: validatedData
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المورد بنجاح',
      data: supplier
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
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private
 */
export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = supplierSchema.partial().parse(cleanSupplierPayload(req.body));

    // Check if supplier exists
    const existing = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'المورد غير موجود'
      });
    }

    // Check phone uniqueness if changed
    if (validatedData.phone && validatedData.phone !== existing.phone) {
      const duplicate = await prisma.supplier.findFirst({
        where: {
          phone: validatedData.phone,
          id: { not: parseInt(id) },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'رقم الهاتف مسجل مسبقاً'
        });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: validatedData
    });

    res.json({
      success: true,
      message: 'تم تحديث بيانات المورد بنجاح',
      data: supplier
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
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (soft delete)
 * @access  Private
 */
export const deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { products: true, purchaseOrders: true }
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'المورد غير موجود'
      });
    }

    // Check if supplier has outstanding balance
    if (supplier.currentBalance.toNumber() > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف المورد لوجود رصيد مستحق: ${supplier.currentBalance} جنيه`
      });
    }

    // Check if supplier has products
    if (supplier._count.products > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف المورد لأنه مرتبط بـ ${supplier._count.products} منتج`
      });
    }

    // Soft delete
    await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'تم حذف المورد بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/suppliers/:id/pay
 * @desc    Update supplier balance (payment)
 * @access  Private
 */
export const paySupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'المورد غير موجود'
      });
    }

    const newBalance = supplier.currentBalance.toNumber() - amount;

    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ المدفوع أكبر من الرصيد المستحق'
      });
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { currentBalance: newBalance }
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      data: {
        supplierId: updatedSupplier.id,
        previousBalance: supplier.currentBalance,
        paidAmount: amount,
        newBalance: updatedSupplier.currentBalance
      }
    });
  } catch (error) {
    next(error);
  }
};
