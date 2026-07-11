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

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      branchId: user.branchId || undefined,
      roles,
      permissions
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...permissionsRequired: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
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
