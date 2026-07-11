import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const branchSchema = z.object({
  name: z.string().min(3).max(100),
  code: z.string().min(2).max(20),
  phone: z.string().regex(/^[0-9+\-() ]{10,20}$/).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  isActive: z.boolean().default(true),
  isMain: z.boolean().default(false)
});

/**
 * @route   GET /api/branches
 * @desc    Get all branches
 * @access  Private
 */
export const getAllBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive, isMain, search } = req.query;

    const where: any = { deletedAt: null };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (isMain !== undefined) {
      where.isMain = isMain === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { code: { contains: search as string } },
        { city: { contains: search as string } }
      ];
    }

    const branches = await prisma.branch.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            sales: true,
            purchaseOrders: true,
            expenses: true
          }
        }
      },
      orderBy: [
        { isMain: 'desc' },
        { name: 'asc' }
      ]
    });

    // Calculate additional statistics for each branch
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        const [totalSales, totalPurchases, totalExpenses, productCount] = await Promise.all([
          prisma.sale.aggregate({
            where: {
              branchId: branch.id,
              status: 'completed',
              deletedAt: null
            },
            _sum: { totalAmount: true }
          }),
          prisma.purchaseOrder.aggregate({
            where: {
              branchId: branch.id,
              deletedAt: null
            },
            _sum: { totalAmount: true }
          }),
          prisma.expense.aggregate({
            where: {
              branchId: branch.id,
              status: 'approved',
              deletedAt: null
            },
            _sum: { amount: true }
          }),
          prisma.inventoryTransaction.groupBy({
            by: ['productId'],
            where: { branchId: branch.id }
          })
        ]);

        return {
          ...branch,
          statistics: {
            totalSales: totalSales._sum.totalAmount || 0,
            totalPurchases: totalPurchases._sum.totalAmount || 0,
            totalExpenses: totalExpenses._sum.amount || 0,
            uniqueProducts: productCount.length
          }
        };
      })
    );

    res.json({
      success: true,
      data: branchesWithStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/branches/statistics
 * @desc    Get branch statistics
 * @access  Private
 */
export const getBranchStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, active, main] = await Promise.all([
      prisma.branch.count({ where: { deletedAt: null } }),
      prisma.branch.count({ where: { isActive: true, deletedAt: null } }),
      prisma.branch.count({ where: { isMain: true, deletedAt: null } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive: total - active,
        mainBranches: main,
        subBranches: total - main
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/branches/:id
 * @desc    Get branch by ID
 * @access  Private
 */
export const getBranchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roles: {
              include: {
                role: {
                  select: { id: true, displayName: true }
                }
              }
            }
          }
        },
        _count: {
          select: {
            sales: true,
            purchaseOrders: true,
            expenses: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    // Get detailed statistics
    const [salesStats, purchaseStats, expenseStats] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          branchId: parseInt(id),
          status: 'completed',
          deletedAt: null
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.purchaseOrder.aggregate({
        where: {
          branchId: parseInt(id),
          deletedAt: null
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.expense.aggregate({
        where: {
          branchId: parseInt(id),
          status: 'approved',
          deletedAt: null
        },
        _sum: { amount: true },
        _count: true
      })
    ]);

    const branchWithStats = {
      ...branch,
      statistics: {
        sales: {
          total: salesStats._sum.totalAmount || 0,
          count: salesStats._count
        },
        purchases: {
          total: purchaseStats._sum.totalAmount || 0,
          count: purchaseStats._count
        },
        expenses: {
          total: expenseStats._sum.amount || 0,
          count: expenseStats._count
        }
      }
    };

    res.json({
      success: true,
      data: branchWithStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/branches
 * @desc    Create new branch
 * @access  Private (Admin only)
 */
export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = branchSchema.parse(req.body);

    // Check if code already exists
    const existingCode = await prisma.branch.findUnique({
      where: { code: validatedData.code }
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'رمز الفرع موجود مسبقاً'
      });
    }

    // If setting as main branch, unset other main branches
    if (validatedData.isMain) {
      await prisma.branch.updateMany({
        where: { isMain: true },
        data: { isMain: false }
      });
    }

    const branch = await prisma.branch.create({
      data: validatedData
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الفرع بنجاح',
      data: branch
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
 * @route   PUT /api/branches/:id
 * @desc    Update branch
 * @access  Private (Admin only)
 */
export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = branchSchema.partial().parse(req.body);

    const existing = await prisma.branch.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    // Check code uniqueness if changed
    if (validatedData.code && validatedData.code !== existing.code) {
      const duplicate = await prisma.branch.findUnique({
        where: { code: validatedData.code }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'رمز الفرع موجود مسبقاً'
        });
      }
    }

    // If setting as main branch, unset other main branches
    if (validatedData.isMain === true) {
      await prisma.branch.updateMany({
        where: { 
          isMain: true,
          id: { not: parseInt(id) }
        },
        data: { isMain: false }
      });
    }

    const branch = await prisma.branch.update({
      where: { id: parseInt(id) },
      data: validatedData
    });

    res.json({
      success: true,
      message: 'تم تحديث الفرع بنجاح',
      data: branch
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
 * @route   DELETE /api/branches/:id
 * @desc    Delete branch
 * @access  Private (Admin only)
 */
export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            users: true,
            sales: true,
            purchaseOrders: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    // Cannot delete main branch
    if (branch.isMain) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف الفرع الرئيسي'
      });
    }

    // Cannot delete if has users
    if (branch._count.users > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف الفرع لأنه يحتوي على ${branch._count.users} موظف`
      });
    }

    // Cannot delete if has transactions
    if (branch._count.sales > 0 || branch._count.purchaseOrders > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف الفرع لوجود معاملات مرتبطة به'
      });
    }

    // Soft delete
    await prisma.branch.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'تم حذف الفرع بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/branches/:id/performance
 * @desc    Get branch performance metrics
 * @access  Private
 */
export const getBranchPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const [sales, expenses, topProducts, topCashiers] = await Promise.all([
      // Sales performance
      prisma.sale.aggregate({
        where: {
          branchId: parseInt(id),
          saleDate: { gte: startDate },
          status: 'completed',
          deletedAt: null
        },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
        _avg: { totalAmount: true }
      }),

      // Expenses
      prisma.expense.aggregate({
        where: {
          branchId: parseInt(id),
          expenseDate: { gte: startDate },
          status: 'approved',
          deletedAt: null
        },
        _sum: { amount: true },
        _count: true
      }),

      // Top products
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            branchId: parseInt(id),
            saleDate: { gte: startDate },
            status: 'completed',
            deletedAt: null
          }
        },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5
      }),

      // Top cashiers
      prisma.sale.groupBy({
        by: ['userId'],
        where: {
          branchId: parseInt(id),
          saleDate: { gte: startDate },
          status: 'completed',
          deletedAt: null
        },
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5
      })
    ]);

    // Get product details
    const productIds = topProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true }
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // Get user details
    const userIds = topCashiers.map(c => c.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const revenue = sales._sum.totalAmount?.toNumber() || 0;
    const expenseAmount = expenses._sum.amount?.toNumber() || 0;
    const profit = revenue - expenseAmount;

    res.json({
      success: true,
      data: {
        period,
        revenue,
        expenses: expenseAmount,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        totalSales: sales._count,
        averageSaleValue: sales._avg.totalAmount || 0,
        topProducts: topProducts.map(p => ({
          product: productMap.get(p.productId),
          quantity: p._sum.quantity || 0,
          revenue: p._sum.totalAmount || 0
        })),
        topCashiers: topCashiers.map(c => ({
          user: userMap.get(c.userId),
          salesCount: c._count,
          totalSales: c._sum.totalAmount || 0
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
