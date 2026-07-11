import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  parentId: z.number().int().optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true)
});

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Private
 */
export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { includeInactive = 'false', withProducts = 'false' } = req.query;

    const where: any = {};
    
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true }
        },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, sortOrder: true }
        },
        ...(withProducts === 'true' ? {
          products: {
            where: { isActive: true },
            select: { id: true, name: true, sku: true, sellingPrice: true, stockQuantity: true }
          }
        } : {
          _count: {
            select: { products: true }
          }
        })
      },
      orderBy: { sortOrder: 'asc' }
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
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private
 */
export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'الفئة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private
 */
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = categorySchema.parse(req.body);

    // Check if category name already exists
    const existing = await prisma.category.findFirst({
      where: { 
        name: validatedData.name,
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'اسم الفئة موجود مسبقاً'
      });
    }

    // Verify parent exists if parentId provided
    if (validatedData.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: validatedData.parentId }
      });

      if (!parent) {
        return res.status(400).json({
          success: false,
          message: 'الفئة الأب غير موجودة'
        });
      }
    }

    const category = await prisma.category.create({
      data: validatedData,
      include: {
        parent: true,
        children: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الفئة بنجاح',
      data: category
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
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private
 */
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = categorySchema.partial().parse(req.body);

    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'الفئة غير موجودة'
      });
    }

    // Check if name is being changed and is unique
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.category.findFirst({
        where: { 
          name: validatedData.name,
          id: { not: parseInt(id) },
          deletedAt: null
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'اسم الفئة موجود مسبقاً'
        });
      }
    }

    // Prevent setting parent to itself or its own child
    if (validatedData.parentId) {
      if (validatedData.parentId === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن جعل الفئة فرعاً لنفسها'
        });
      }

      // Check if parent exists
      const parent = await prisma.category.findUnique({
        where: { id: validatedData.parentId }
      });

      if (!parent) {
        return res.status(400).json({
          success: false,
          message: 'الفئة الأب غير موجودة'
        });
      }

      // Check if trying to set a child as parent (would create circular reference)
      if (parent.parentId === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن جعل الفئة الفرعية فئة أب'
        });
      }
    }

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: validatedData,
      include: {
        parent: true,
        children: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الفئة بنجاح',
      data: category
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
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Private
 */
export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { products: true, children: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'الفئة غير موجودة'
      });
    }

    // Prevent deleting if has products
    if (category._count.products > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف الفئة لأنها تحتوي على ${category._count.products} منتج`
      });
    }

    // Prevent deleting if has children
    if (category._count.children > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف الفئة لأنها تحتوي على ${category._count.children} فئة فرعية`
      });
    }

    // Soft delete
    await prisma.category.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'تم حذف الفئة بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/categories/:id/products
 * @desc    Get all products in a category
 * @access  Private
 */
export const getCategoryProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', includeSubcategories = 'false' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'الفئة غير موجودة'
      });
    }

    // Build where clause
    const where: any = {
      isActive: true,
      deletedAt: null
    };

    if (includeSubcategories === 'true') {
      // Get all subcategory IDs
      const subcategories = await prisma.category.findMany({
        where: { parentId: parseInt(id) },
        select: { id: true }
      });

      const categoryIds = [parseInt(id), ...subcategories.map(c => c.id)];
      where.categoryId = { in: categoryIds };
    } else {
      where.categoryId = parseInt(id);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      data: products,
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
