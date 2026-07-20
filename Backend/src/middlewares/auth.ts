import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../config/database';
import { createError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        branchId?: number;
        roles: string[];
        permissions: string[];
        menuAccess: string[];
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (decoded.type !== 'access') {
      throw createError('Invalid token type', 401);
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
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
        branch: true
      }
    });

    if (!user) {
      throw createError('User not found', 401);
    }

    if (!user.isActive) {
      throw createError('User account is inactive', 403);
    }

    // Extract roles and permissions
    const roles = user.roles.map(ur => ur.role.name);
    const permissions = user.roles
      .flatMap(ur => ur.role.permissions)
      .map(rp => rp.permission.name)
      .filter((value, index, self) => self.indexOf(value) === index); // unique

    let menuAccess: string[] = [];
    if (user.menuAccess) {
      try {
        const parsed = JSON.parse(user.menuAccess);
        if (Array.isArray(parsed)) menuAccess = parsed.map(String);
      } catch { /* ignore */ }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      branchId: user.branchId || undefined,
      roles,
      permissions,
      menuAccess,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/** Allow if user has menu section access (or admin/manager). Falls back to role defaults when menuAccess empty. */
export const requireMenuAccess = (...sections: string[]) => {
  const roleDefaults: Record<string, string[]> = {
    admin: ['dashboard','pos','sales','quotations','returns','customers','inventory','purchases','finance','reports','activity','hr','settings'],
    manager: ['dashboard','pos','sales','quotations','returns','customers','inventory','purchases','finance','reports','activity','settings'],
    cashier: ['pos','sales','returns','customers'],
    employee: ['returns','customers'],
    accountant: ['dashboard','sales','quotations','returns','customers','inventory','purchases','finance','reports','activity','settings'],
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (req.user.roles.includes('admin') || req.user.roles.includes('manager')) {
      return next();
    }

    let allowed = req.user.menuAccess || [];
    if (!allowed.length) {
      for (const role of req.user.roles) {
        if (roleDefaults[role]) {
          allowed = roleDefaults[role];
          break;
        }
      }
    }

    const ok = sections.some((s) => allowed.includes(s));
    if (!ok) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

export const authorize = (...permissionsRequired: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    // Admins always have full access
    if (req.user.roles.includes('admin') || req.user.roles.includes('manager')) {
      return next();
    }

    if (permissionsRequired.length === 0) {
      return next();
    }

    const hasPermission = permissionsRequired.some(permission =>
      req.user!.permissions.includes(permission) ||
      req.user!.permissions.includes('*')
    );

    if (!hasPermission) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireRole = (...rolesRequired: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    const hasRole = rolesRequired.some(role => 
      req.user!.roles.includes(role)
    );

    if (!hasRole) {
      return next(createError('Insufficient role', 403));
    }

    next();
  };
};

// Alias for backward compatibility
export const authenticateToken = authenticate;
