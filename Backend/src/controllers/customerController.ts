import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const createCustomerSchema = z.object({
  name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(100),
  phone: z.string().regex(/^[0-9+\-() ]{10,20}$/, 'رقم الهاتف غير صحيح'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
  taxNumber: z.string().optional(),
  type: z.enum(['individual', 'company']).default('individual'),
  companyName: z.string().optional(),
  creditLimit: z.number().nonnegative().default(0),
  currentBalance: z.number().default(0),
  customerTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).default('bronze'),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  birthdate: z.string().datetime().optional(),
  addresses: z.array(z.object({
    type: z.enum(['billing', 'shipping', 'both']).default('both'),
    address: z.string(),
    city: z.string(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    isDefault: z.boolean().default(false)
  })).optional()
});

const updateCustomerSchema = createCustomerSchema.partial().extend({
  phone: z.string().regex(/^[0-9+\-() ]{10,20}$/, 'رقم الهاتف غير صحيح').optional()
});

/**
 * @route   GET /api/customers
 * @desc    Get all customers with filters
 * @access  Private
 */
export const getAllCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      type,
      customerTier,
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
        { phone: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (customerTier) {
      where.customerTier = customerTier;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (hasDebt === 'true') {
      where.currentBalance = { gt: 0 };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          addresses: {
            where: { isDefault: true },
            take: 1
          },
          _count: {
            select: { sales: true }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: customers,
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
 * @route   GET /api/customers/statistics
 * @desc    Get customer statistics
 * @access  Private
 */
export const getCustomerStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, vipCount, totalDebt, recentSales] = await Promise.all([
      prisma.customer.count({ where: { isActive: true, deletedAt: null } }),
      prisma.customer.count({ 
        where: { 
          customerTier: { in: ['gold', 'platinum'] },
          isActive: true,
          deletedAt: null
        } 
      }),
      prisma.customer.aggregate({
        where: { currentBalance: { gt: 0 }, deletedAt: null },
        _sum: { currentBalance: true },
        _count: true
      }),
      prisma.sale.count({
        where: {
          saleDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        total,
        vipCount,
        activeCustomers: total,
        customersWithDebt: totalDebt._count,
        totalDebt: totalDebt._sum.currentBalance || 0,
        recentSales
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' }
        },
        sales: {
          take: 10,
          orderBy: { saleDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            saleDate: true,
            totalAmount: true,
            paymentStatus: true
          }
        },
        _count: {
          select: { sales: true }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    // Calculate total purchases
    const purchaseStats = await prisma.sale.aggregate({
      where: {
        customerId: parseInt(id),
        status: 'completed'
      },
      _sum: { totalAmount: true },
      _count: true
    });

    const customerWithStats = {
      ...customer,
      totalPurchases: purchaseStats._sum.totalAmount || 0,
      totalOrders: purchaseStats._count
    };

    res.json({
      success: true,
      data: customerWithStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private
 */
export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createCustomerSchema.parse(req.body);

    // Check if phone already exists
    const existing = await prisma.customer.findFirst({
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

    // Separate addresses from customer data
    const { addresses, ...customerData } = validatedData;

    const customer = await prisma.customer.create({
      data: {
        ...customerData,
        birthdate: customerData.birthdate ? new Date(customerData.birthdate) : undefined,
        ...(addresses && addresses.length > 0 ? {
          addresses: {
            create: addresses
          }
        } : {})
      },
      include: {
        addresses: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة العميل بنجاح',
      data: customer
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
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  Private
 */
export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = updateCustomerSchema.parse(req.body);

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    // Check phone uniqueness if changed
    if (validatedData.phone && validatedData.phone !== existing.phone) {
      const duplicate = await prisma.customer.findFirst({
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

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...validatedData,
        birthdate: validatedData.birthdate ? new Date(validatedData.birthdate) : undefined
      },
      include: {
        addresses: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث بيانات العميل بنجاح',
      data: customer
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
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer (soft delete)
 * @access  Private
 */
export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { sales: true }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    // Check if customer has outstanding balance
    if (customer.currentBalance > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف العميل لوجود رصيد مستحق: ${customer.currentBalance} جنيه`
      });
    }

    // Soft delete
    await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'تم حذف العميل بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/customers/:id/update-balance
 * @desc    Update customer balance
 * @access  Private
 */
export const updateCustomerBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, operation, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'نوع العملية يجب أن يكون add أو subtract'
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    const newBalance = operation === 'add' 
      ? customer.currentBalance.toNumber() + amount
      : customer.currentBalance.toNumber() - amount;

    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن أن يكون الرصيد سالباً'
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { currentBalance: newBalance }
    });

    res.json({
      success: true,
      message: 'تم تحديث رصيد العميل بنجاح',
      data: {
        customerId: updatedCustomer.id,
        previousBalance: customer.currentBalance,
        newBalance: updatedCustomer.currentBalance,
        operation,
        amount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/customers/:id/addresses
 * @desc    Add address to customer
 * @access  Private
 */
export const addCustomerAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const addressData = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    // If this is default address, unset other defaults
    if (addressData.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: parseInt(id), isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.customerAddress.create({
      data: {
        ...addressData,
        customerId: parseInt(id)
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة العنوان بنجاح',
      data: address
    });
  } catch (error) {
    next(error);
  }
};
