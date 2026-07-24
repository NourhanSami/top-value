import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const expenseSchema = z.object({
  expenseCategoryId: z.number().int(),
  branchId: z.number().int(),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  amount: z.number().positive(),
  expenseDate: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'check', 'bank_transfer']).default('cash'),
  referenceNumber: z.string().optional(),
  receiptImage: z.string().optional(),
  notes: z.string().optional()
});

/**
 * @route   GET /api/expenses
 * @desc    Get all expenses
 * @access  Private
 */
export const getAllExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      categoryId,
      branchId,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      sortBy = 'expenseDate',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
        { referenceNumber: { contains: search as string } }
      ];
    }

    if (categoryId) {
      where.expenseCategoryId = parseInt(categoryId as string);
    }

    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (dateFrom || dateTo) {
      where.expenseDate = {};
      if (dateFrom) {
        const from = new Date(dateFrom as string);
        from.setHours(0, 0, 0, 0);
        where.expenseDate.gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        where.expenseDate.lte = to;
      }
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) {
        where.amount.gte = parseFloat(minAmount as string);
      }
      if (maxAmount) {
        where.amount.lte = parseFloat(maxAmount as string);
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true }
          },
          branch: {
            select: { id: true, name: true }
          },
          user: {
            select: { id: true, name: true }
          },
          approver: {
            select: { id: true, name: true }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.expense.count({ where })
    ]);

    res.json({
      success: true,
      data: expenses,
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
 * @route   GET /api/expenses/statistics
 * @desc    Get expense statistics
 * @access  Private
 */
export const getExpenseStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'month', branchId, categoryId, dateFrom, dateTo } = req.query;

    const now = new Date();
    let startDate: Date;
    let endDate: Date | undefined;

    if (dateFrom || dateTo || period === 'custom') {
      startDate = dateFrom
        ? new Date(dateFrom as string)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      if (dateTo) {
        endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      switch (period) {
        case 'today': {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        }
        case 'yesterday': {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate.setMilliseconds(-1);
          break;
        }
        case 'week': {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        }
        case 'month': {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        }
        case 'year': {
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        }
        default: {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
      }
    }

    const where: any = {
      expenseDate: endDate ? { gte: startDate, lte: endDate } : { gte: startDate },
      deletedAt: null
    };

    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }

    if (categoryId) {
      where.expenseCategoryId = parseInt(categoryId as string);
    }

    const [stats, categoryBreakdown, paymentMethodBreakdown] = await Promise.all([
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true }
      }),
      prisma.expense.groupBy({
        by: ['expenseCategoryId'],
        where,
        _sum: { amount: true },
        _count: true
      }),
      prisma.expense.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { amount: true },
        _count: true
      })
    ]);

    // Get category names
    const categories = await prisma.expenseCategory.findMany({
      where: {
        id: { in: categoryBreakdown.map(c => c.expenseCategoryId) }
      },
      select: { id: true, name: true }
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    res.json({
      success: true,
      data: {
        period,
        totalExpenses: stats._sum.amount || 0,
        totalCount: stats._count,
        averageExpense: stats._avg.amount || 0,
        byCategory: categoryBreakdown.map(c => ({
          categoryId: c.expenseCategoryId,
          categoryName: categoryMap.get(c.expenseCategoryId) || 'غير معروف',
          amount: c._sum.amount || 0,
          count: c._count
        })),
        byPaymentMethod: paymentMethodBreakdown.map(p => ({
          paymentMethod: p.paymentMethod,
          amount: p._sum.amount || 0,
          count: p._count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/expenses/:id
 * @desc    Get expense by ID
 * @access  Private
 */
export const getExpenseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        branch: true,
        user: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/expenses
 * @desc    Create new expense
 * @access  Private
 */
export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = expenseSchema.parse(req.body);
    const userId = (req as any).user.id;

    const expense = await prisma.expense.create({
      data: {
        ...validatedData,
        userId,
        expenseDate: validatedData.expenseDate ? new Date(validatedData.expenseDate) : new Date(),
        status: 'approved'
      },
      include: {
        category: true,
        branch: true,
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المصروف بنجاح',
      data: expense
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
 * @route   PUT /api/expenses/:id
 * @desc    Update expense
 * @access  Private
 */
export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = expenseSchema.partial().parse(req.body);

    const existing = await prisma.expense.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود'
      });
    }

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        ...validatedData,
        expenseDate: validatedData.expenseDate ? new Date(validatedData.expenseDate) : undefined
      },
      include: {
        category: true,
        branch: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث المصروف بنجاح',
      data: expense
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
 * @route   POST /api/expenses/:id/approve
 * @desc    Approve expense
 * @access  Private (Admin/Manager only)
 */
export const approveExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود'
      });
    }

    if (expense.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'تمت الموافقة على هذا المصروف مسبقاً'
      });
    }

    const updated = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date()
      },
      include: {
        category: true,
        approver: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'تمت الموافقة على المصروف',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/expenses/:id/reject
 * @desc    Reject expense
 * @access  Private (Admin/Manager only)
 */
export const rejectExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود'
      });
    }

    const updated = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        status: 'rejected',
        notes: notes || expense.notes
      }
    });

    res.json({
      success: true,
      message: 'تم رفض المصروف',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete expense
 * @access  Private
 */
export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'المصروف غير موجود'
      });
    }

    if (expense.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف مصروف تمت الموافقة عليه'
      });
    }

    await prisma.expense.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'تم حذف المصروف بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/expense-categories
 * @desc    Get all expense categories
 * @access  Private
 */
export const getAllExpenseCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        parent: {
          select: { id: true, name: true }
        },
        _count: {
          select: { expenses: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/expenses/categories
 * @desc    Create expense category
 */
export const createExpenseCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, nameEn, description, parentId } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'اسم التصنيف مطلوب' });
    }
    const existing = await prisma.expenseCategory.findFirst({
      where: { name: String(name).trim(), deletedAt: null },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'التصنيف موجود مسبقاً' });
    }
    const category = await prisma.expenseCategory.create({
      data: {
        name: String(name).trim(),
        nameEn: nameEn || null,
        description: description || null,
        parentId: parentId ? Number(parentId) : null,
        isActive: true,
      },
    });
    res.status(201).json({ success: true, message: 'تم إضافة التصنيف', data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Ensure fuel category exists (idempotent helper used by seed/UI)
 */
export const ensureFuelExpenseCategory = async () => {
  const existing = await prisma.expenseCategory.findFirst({
    where: { OR: [{ name: 'وقود' }, { nameEn: 'fuel' }], deletedAt: null },
  });
  if (existing) return existing;
  return prisma.expenseCategory.create({
    data: { name: 'وقود', nameEn: 'fuel', description: 'تكلفة المحروقات والوقود', isActive: true },
  });
};
