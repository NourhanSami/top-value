import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(200),
  nameEn: z.string().optional(),
  sku: z.string().min(1, 'رمز المنتج مطلوب'),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.number().int().optional(),
  supplierId: z.number().int().optional(),
  costPrice: z.number().nonnegative('سعر التكلفة يجب أن يكون صفر أو أكبر').default(0),
  sellingPrice: z.number().nonnegative('سعر البيع يجب أن يكون صفر أو أكبر'),
  minSellingPrice: z.number().nonnegative().optional(),
  unit: z.string().default('قطعة'),
  stockQuantity: z.number().int().nonnegative().default(0),
  minStockLevel: z.number().int().nonnegative().default(0),
  maxStockLevel: z.number().int().nonnegative().optional(),
  trackInventory: z.boolean().default(true),
  isActive: z.boolean().default(true),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  isTaxable: z.boolean().default(true),
  notes: z.string().optional()
});

const updateProductSchema = createProductSchema.partial();

// Generate unique barcode (13 digits)
async function generateUniqueBarcode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    
    const existing = await prisma.product.findUnique({
      where: { barcode }
    });

    if (!existing) {
      return barcode;
    }
    
    attempts++;
  }

  throw new Error('فشل في توليد باركود فريد بعد 10 محاولات');
}

// Get stock status helper
function getStockStatus(stockQuantity: number, minStockLevel: number): string {
  if (stockQuantity === 0) return 'out_of_stock';
  if (stockQuantity <= minStockLevel) return 'low_stock';
  if (stockQuantity <= minStockLevel * 2) return 'medium_stock';
  return 'in_stock';
}

/**
 * @route   GET /api/products
 * @desc    Get all products with filters and pagination
 * @access  Private
 */
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      categoryId,
      supplierId,
      stockStatus,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { sku: { contains: search as string } },
        { barcode: { contains: search as string } }
      ];
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId as string);
    }

    if (supplierId) {
      where.supplierId = parseInt(supplierId as string);
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, nameEn: true }
          },
          supplier: {
            select: { id: true, name: true, phone: true }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.product.count({ where })
    ]);

    // Add computed fields
    const productsWithStatus = products.map(product => ({
      ...product,
      stockStatus: getStockStatus(product.stockQuantity, product.minStockLevel)
    }));

    // Filter by stock status if provided
    const filteredProducts = stockStatus
      ? productsWithStatus.filter(p => p.stockStatus === stockStatus)
      : productsWithStatus;

    res.json({
      success: true,
      data: filteredProducts,
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
 * @route   GET /api/products/statistics
 * @desc    Get product statistics
 * @access  Private
 */
export const getProductStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        stockQuantity: true,
        minStockLevel: true
      }
    });

    const statistics = {
      total: products.length,
      available: products.filter(p => p.stockQuantity > p.minStockLevel * 2).length,
      medium: products.filter(p => p.stockQuantity > p.minStockLevel && p.stockQuantity <= p.minStockLevel * 2).length,
      low: products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStockLevel).length,
      outOfStock: products.filter(p => p.stockQuantity === 0).length
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        supplier: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    const productWithStatus = {
      ...product,
      stockStatus: getStockStatus(product.stockQuantity, product.minStockLevel)
    };

    res.json({
      success: true,
      data: productWithStatus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createProductSchema.parse(req.body);

    // Generate barcode if not provided
    if (!validatedData.barcode) {
      validatedData.barcode = await generateUniqueBarcode();
    }

    // Check if SKU already exists
    const existingSKU = await prisma.product.findUnique({
      where: { sku: validatedData.sku }
    });

    if (existingSKU) {
      return res.status(400).json({
        success: false,
        message: 'رمز المنتج (SKU) موجود مسبقاً'
      });
    }

    // Check if barcode already exists
    if (validatedData.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: validatedData.barcode }
      });

      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: 'الباركود موجود مسبقاً'
        });
      }
    }

    const product = await prisma.product.create({
      data: validatedData as any,
      include: {
        category: true,
        supplier: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المنتج بنجاح',
      data: product
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
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = updateProductSchema.parse(req.body);

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Check SKU uniqueness if changed
    if (validatedData.sku && validatedData.sku !== existing.sku) {
      const existingSKU = await prisma.product.findUnique({
        where: { sku: validatedData.sku }
      });

      if (existingSKU) {
        return res.status(400).json({
          success: false,
          message: 'رمز المنتج (SKU) موجود مسبقاً'
        });
      }
    }

    // Check barcode uniqueness if changed
    if (validatedData.barcode && validatedData.barcode !== existing.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: validatedData.barcode }
      });

      if (existingBarcode) {
        return res.status(400).json({
          success: false,
          message: 'الباركود موجود مسبقاً'
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: validatedData as any,
      include: {
        category: true,
        supplier: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: product
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
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private
 */
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Soft delete by updating deletedAt
    await prisma.product.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/products/barcode/:barcode
 * @desc    Get product by barcode
 * @access  Private
 */
export const getProductByBarcode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.params;

    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        supplier: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    const productWithStatus = {
      ...product,
      stockStatus: getStockStatus(product.stockQuantity, product.minStockLevel)
    };

    res.json({
      success: true,
      data: productWithStatus
    });
  } catch (error) {
    next(error);
  }
};
