import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const MENU_KEYS = [
  'dashboard', 'pos', 'sales', 'quotations', 'returns', 'customers',
  'inventory', 'purchases', 'finance', 'reports', 'activity', 'hr', 'settings',
] as const;

const ROLE_MENU_DEFAULTS: Record<string, string[]> = {
  admin: [...MENU_KEYS],
  manager: ['dashboard', 'pos', 'sales', 'quotations', 'returns', 'customers', 'inventory', 'purchases', 'finance', 'reports', 'activity', 'settings'],
  cashier: ['pos', 'sales', 'returns', 'customers'],
  employee: ['returns', 'customers'],
  accountant: ['dashboard', 'sales', 'quotations', 'returns', 'customers', 'inventory', 'purchases', 'finance', 'reports', 'activity', 'settings'],
};

function parseJsonArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function slugifyRoleName(input: string): string {
  const ascii = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const latinOnly = ascii.replace(/[^a-z0-9-]/g, '');
  if (latinOnly.length >= 2) return latinOnly.slice(0, 40);
  return `custom-${Date.now().toString(36)}`;
}

function formatRole(role: any) {
  const menuAccess = parseJsonArray(role.menuAccess);
  return {
    ...role,
    menuAccess: menuAccess.length
      ? menuAccess
      : (ROLE_MENU_DEFAULTS[role.name] || ['dashboard', 'customers', 'returns']),
    permissions: (role.permissions || []).map((p: any) => p.permission || p),
    userCount: role._count?.users ?? role.userCount ?? 0,
  };
}

const createRoleSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-z][a-z0-9_-]*$/i, 'اسم الدور التقني يجب أن يكون لاتينيًا').optional(),
  displayName: z.string().min(2).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  permissionIds: z.array(z.number().int().positive()).default([]),
  menuAccess: z.array(z.string()).min(1, 'حدد قسماً واحداً على الأقل'),
});

const updateRoleSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable().or(z.literal('')),
  permissionIds: z.array(z.number().int().positive()).optional(),
  menuAccess: z.array(z.string()).min(1).optional(),
});

export const listRoles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { displayName: 'asc' }],
    });

    res.json({
      success: true,
      data: roles.map(formatRole),
    });
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'الدور غير موجود' });
    }

    res.json({ success: true, data: formatRole(role) });
  } catch (error) {
    next(error);
  }
};

export const listPermissions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });

    const byModule: Record<string, typeof permissions> = {};
    for (const p of permissions) {
      const mod = p.module || 'other';
      if (!byModule[mod]) byModule[mod] = [];
      byModule[mod].push(p);
    }

    res.json({
      success: true,
      data: permissions,
      grouped: byModule,
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRoleSchema.parse(req.body);
    const menuAccess = data.menuAccess.filter((k) => (MENU_KEYS as readonly string[]).includes(k));
    if (!menuAccess.length) {
      return res.status(400).json({ success: false, message: 'أقسام القائمة غير صالحة' });
    }

    let name = (data.name || slugifyRoleName(data.displayName)).toLowerCase();
    const reserved = ['admin', 'manager', 'cashier', 'employee', 'accountant'];
    if (reserved.includes(name)) {
      name = `${name}-custom`;
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      name = `${name}-${Date.now().toString(36).slice(-4)}`;
    }

    if (data.permissionIds.length) {
      const count = await prisma.permission.count({ where: { id: { in: data.permissionIds } } });
      if (count !== data.permissionIds.length) {
        return res.status(400).json({ success: false, message: 'بعض الصلاحيات غير موجودة' });
      }
    }

    const role = await prisma.role.create({
      data: {
        name,
        displayName: data.displayName.trim(),
        description: data.description || null,
        isSystem: false,
        menuAccess: JSON.stringify(menuAccess),
        permissions: {
          create: data.permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الدور بنجاح',
      data: formatRole(role),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'بيانات غير صحيحة',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateRoleSchema.parse(req.body);

    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الدور غير موجود' });
    }

    const updateData: any = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName.trim();
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.menuAccess !== undefined) {
      const menuAccess = data.menuAccess.filter((k) => (MENU_KEYS as readonly string[]).includes(k));
      if (!menuAccess.length) {
        return res.status(400).json({ success: false, message: 'أقسام القائمة غير صالحة' });
      }
      updateData.menuAccess = JSON.stringify(menuAccess);
    }

    if (data.permissionIds !== undefined) {
      if (existing.name === 'admin' && !data.permissionIds.length) {
        return res.status(400).json({ success: false, message: 'لا يمكن تفريغ صلاحيات مدير النظام' });
      }
      if (data.permissionIds.length) {
        const count = await prisma.permission.count({ where: { id: { in: data.permissionIds } } });
        if (count !== data.permissionIds.length) {
          return res.status(400).json({ success: false, message: 'بعض الصلاحيات غير موجودة' });
        }
      }
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (data.permissionIds.length) {
        await prisma.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    res.json({
      success: true,
      message: 'تم تحديث الدور',
      data: formatRole(role),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'بيانات غير صحيحة',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'الدور غير موجود' });
    }
    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف الأدوار الأساسية للنظام' });
    }
    if (role._count.users > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن الحذف — مرتبط بـ ${role._count.users} مستخدم. انقل المستخدمين أولاً`,
      });
    }

    await prisma.role.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الدور' });
  } catch (error) {
    next(error);
  }
};
