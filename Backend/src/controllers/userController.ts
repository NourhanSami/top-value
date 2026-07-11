import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().regex(/^[0-9+\-() ]{10,20}$/).optional(),
  branchId: z.number().int().optional(),
  roleIds: z.array(z.number().int()).min(1, 'يجب تحديد صلاحية واحدة على الأقل'),
  isActive: z.boolean().default(true)
});

const updateUserSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().regex(/^[0-9+\-() ]{10,20}$/).optional(),
  branchId: z.number().int().optional(),
  roleIds: z.array(z.number().int()).optional(),
  isActive: z.boolean().optional()
});

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      branchId,
      roleId,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } }
      ];
    }

    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Role filter
    if (roleId) {
      where.roles = {
        some: {
          roleId: parseInt(roleId as string)
        }
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          branchId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          branch: {
            select: { id: true, name: true, code: true }
          },
          roles: {
            include: {
              role: {
                select: { id: true, name: true, displayName: true }
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
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users.map(user => ({
        ...user,
        roles: user.roles.map(r => r.role)
      })),
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
 * @route   GET /api/users/statistics
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
export const getUserStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, active, byRole] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.userRole.groupBy({
        by: ['roleId'],
        _count: true
      })
    ]);

    // Get role names
    const roleIds = byRole.map(r => r.roleId);
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, displayName: true }
    });
    const roleMap = new Map(roles.map(r => [r.id, r.displayName]));

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive: total - active,
        byRole: byRole.map(r => ({
          roleId: r.roleId,
          roleName: roleMap.get(r.roleId) || 'غير معروف',
          count: r._count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        branchId: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: { id: true, name: true, code: true }
        },
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Get activity statistics
    const [salesStats, activityCount] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          userId: parseInt(id),
          status: 'completed',
          deletedAt: null
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.activityLog.count({
        where: { userId: parseInt(id) }
      })
    ]);

    res.json({
      success: true,
      data: {
        ...user,
        roles: user.roles.map(r => ({
          ...r.role,
          permissions: r.role.permissions.map(p => p.permission)
        })),
        statistics: {
          totalSales: salesStats._sum.totalAmount || 0,
          salesCount: salesStats._count,
          activityCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createUserSchema.parse(req.body);

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل مسبقاً'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user with roles
    const { roleIds, ...userData } = validatedData;

    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        roles: {
          create: roleIds.map(roleId => ({ roleId }))
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        branchId: true,
        isActive: true,
        branch: {
          select: { id: true, name: true }
        },
        roles: {
          include: {
            role: {
              select: { id: true, name: true, displayName: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المستخدم بنجاح',
      data: {
        ...user,
        roles: user.roles.map(r => r.role)
      }
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
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Check email uniqueness if changed
    if (validatedData.email && validatedData.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: validatedData.email }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مسجل مسبقاً'
        });
      }
    }

    // Prepare update data
    const { roleIds, password, ...updateData } = validatedData;
    const finalData: any = { ...updateData };

    // Hash password if provided
    if (password) {
      finalData.password = await hashPassword(password);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: finalData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        branchId: true,
        isActive: true,
        branch: {
          select: { id: true, name: true }
        },
        roles: {
          include: {
            role: {
              select: { id: true, name: true, displayName: true }
            }
          }
        }
      }
    });

    // Update roles if provided
    if (roleIds && roleIds.length > 0) {
      // Delete existing roles
      await prisma.userRole.deleteMany({
        where: { userId: parseInt(id) }
      });

      // Create new roles
      await prisma.userRole.createMany({
        data: roleIds.map(roleId => ({
          userId: parseInt(id),
          roleId
        }))
      });

      // Fetch updated user with new roles
      const updatedUser = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          branchId: true,
          isActive: true,
          branch: {
            select: { id: true, name: true }
          },
          roles: {
            include: {
              role: {
                select: { id: true, name: true, displayName: true }
              }
            }
          }
        }
      });

      return res.json({
        success: true,
        message: 'تم تحديث بيانات المستخدم بنجاح',
        data: {
          ...updatedUser,
          roles: updatedUser?.roles.map(r => r.role)
        }
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات المستخدم بنجاح',
      data: {
        ...user,
        roles: user.roles.map(r => r.role)
      }
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
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user.id;

    // Cannot delete self
    if (parseInt(id) === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك حذف حسابك الشخصي'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Soft delete
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/:id/activity
 * @desc    Get user activity log
 * @access  Private (Admin only)
 */
export const getUserActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: parseInt(id) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.activityLog.count({
        where: { userId: parseInt(id) }
      })
    ]);

    res.json({
      success: true,
      data: activities,
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
 * @route   GET /api/roles
 * @desc    Get all roles
 * @access  Private
 */
export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { displayName: 'asc' }
    });

    res.json({
      success: true,
      data: roles.map(role => ({
        ...role,
        permissions: role.permissions.map(p => p.permission),
        userCount: role._count.users
      }))
    });
  } catch (error) {
    next(error);
  }
};
