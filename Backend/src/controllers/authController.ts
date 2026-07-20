import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyToken } from '../utils/jwt';
import { createError } from '../middlewares/errorHandler';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        branch: true,
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
        }
      }
    });

    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw createError('Account is inactive', 403);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || req.socket.remoteAddress
      }
    });

    // Log activity
    try {
      const { logActivity, metaFromReq } = await import('../services/activityLogService');
      await logActivity({
        userId: user.id,
        action: 'login',
        entityType: 'User',
        entityId: user.id,
        description: `تسجيل دخول — ${user.name}`,
        ...metaFromReq(req),
      });
    } catch { /* ignore logging errors */ }

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    // Extract permissions
    const permissions = user.roles
      .flatMap(ur => ur.role.permissions)
      .map(rp => rp.permission.name)
      .filter((value, index, self) => self.indexOf(value) === index);

    // Send response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.roles[0]?.role.name || 'employee',
          branch_id: user.branchId,
          branch_name: user.branch?.name,
          permissions
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expires_in: tokens.expiresIn
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw createError('Invalid token type', 401);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      throw createError('User not found or inactive', 401);
    }

    // Generate new tokens
    const tokens = generateTokens(user.id, user.email);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expires_in: tokens.expiresIn
      }
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    // Get full user data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        branch: true,
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
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Extract permissions
    const permissions = user.roles
      .flatMap(ur => ur.role.permissions)
      .map(rp => rp.permission.name)
      .filter((value, index, self) => self.indexOf(value) === index);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.roles[0]?.role.name || 'employee',
          branch_id: user.branchId,
          branch_name: user.branch?.name,
          permissions,
          is_active: user.isActive,
          last_login_at: user.lastLoginAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, phone, branchId } = req.body;

    // Validate input
    if (!name || !email || !password) {
      throw createError('Name, email, and password are required', 400);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        branchId: branchId || null,
        isActive: true
      }
    });

    // Assign default role (employee)
    const employeeRole = await prisma.role.findFirst({
      where: { name: 'employee' }
    });

    if (employeeRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: employeeRole.id
        }
      });
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};
