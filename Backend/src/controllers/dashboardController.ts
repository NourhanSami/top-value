import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard statistics
 * @access  Private
 */
export const getDashboardStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.query;
    const userId = (req as any).user.id;

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(now.setDate(now.getDate() - 7));
    const monthAgo = new Date(now.setMonth(now.getMonth() - 1));

    const where: any = {
      deletedAt: null,
      ...(branchId && { branchId: parseInt(branchId as string) })
    };

    // Sales statistics
    const [todaySales, monthSales, previousMonthSales] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          ...where,
          saleDate: { gte: todayStart },
          status: 'completed'
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: {
          ...where,
          saleDate: { gte: monthAgo },
          status: 'completed'
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: {
          ...where,
          saleDate: {
            gte: new Date(monthAgo.getTime() - (now.getTime() - monthAgo.getTime())),
            lt: monthAgo
          },
          status: 'completed'
        },
        _sum: { totalAmount: true },
        _count: true
      })
    ]);

    // Calculate sales change
    const salesChange = previousMonthSales._sum.totalAmount?.toNumber() || 0 > 0
      ? ((((monthSales._sum.totalAmount?.toNumber() || 0) - (previousMonthSales._sum.totalAmount?.toNumber() || 0)) / (previousMonthSales._sum.totalAmount?.toNumber() || 1)) * 100)
      : 0;

    const ordersChange = previousMonthSales._count > 0
      ? (((monthSales._count - previousMonthSales._count) / previousMonthSales._count) * 100)
      : 0;

    // Product statistics
    const products = await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: { stockQuantity: true, minStockLevel: true }
    });

    const lowStockProducts = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStockLevel).length;
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length;

    // Customer statistics
    const [totalCustomers, newCustomersThisWeek, vipCustomers] = await Promise.all([
      prisma.customer.count({
        where: { isActive: true, deletedAt: null }
      }),
      prisma.customer.count({
        where: {
          createdAt: { gte: weekAgo },
          isActive: true,
          deletedAt: null
        }
      }),
      prisma.customer.count({
        where: {
          customerTier: { in: ['gold', 'platinum'] },
          isActive: true,
          deletedAt: null
        }
      })
    ]);

    // Recent sales
    const recentSales = await prisma.sale.findMany({
      where: {
        ...where,
        status: 'completed'
      },
      take: 10,
      orderBy: { saleDate: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        user: {
          select: { id: true, name: true }
        }
      }
    });

    // Top products (most sold this month)
    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          ...where,
          saleDate: { gte: monthAgo },
          status: 'completed'
        }
      },
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10
    });

    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, sku: true, sellingPrice: true }
    });

    const productMap = new Map(productDetails.map(p => [p.id, p]));

    const topProductsWithDetails = topProducts.map(p => ({
      product: productMap.get(p.productId),
      quantitySold: p._sum.quantity || 0,
      totalRevenue: p._sum.totalAmount || 0
    }));

    // Pending approvals (expenses)
    const pendingExpenses = await prisma.expense.count({
      where: {
        ...where,
        status: 'pending'
      }
    });

    // Low stock alerts - products where quantity is less than or equal to minimum level
    const lowStockAlertsRaw = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      sku: string;
      stockQuantity: number;
      minStockLevel: number;
    }>>`
      SELECT id, name, sku, stock_quantity as stockQuantity, min_stock_level as minStockLevel
      FROM products
      WHERE is_active = 1
        AND deleted_at IS NULL
        AND stock_quantity <= min_stock_level
      ORDER BY stock_quantity ASC
      LIMIT 10
    `;
    
    const lowStockAlerts = lowStockAlertsRaw;

    // Revenue breakdown (cash vs credit)
    const revenueBreakdown = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: {
        ...where,
        saleDate: { gte: monthAgo },
        status: 'completed'
      },
      _sum: { totalAmount: true }
    });

    res.json({
      success: true,
      data: {
        // Sales Overview
        sales: {
          today: todaySales._sum.totalAmount || 0,
          thisMonth: monthSales._sum.totalAmount || 0,
          salesChange: parseFloat(salesChange.toFixed(2)),
          totalOrders: monthSales._count,
          ordersChange: parseFloat(ordersChange.toFixed(2))
        },
        
        // Products Overview
        products: {
          total: products.length,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
          needsReorder: lowStockProducts + outOfStockProducts
        },

        // Customers Overview
        customers: {
          total: totalCustomers,
          newThisWeek: newCustomersThisWeek,
          vip: vipCustomers
        },

        // Recent activity
        recentSales: recentSales.map(sale => ({
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          customer: sale.customer,
          totalAmount: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          saleDate: sale.saleDate,
          cashier: sale.user
        })),

        // Top products
        topProducts: topProductsWithDetails,

        // Alerts
        alerts: {
          pendingExpenses,
          lowStockCount: lowStockProducts,
          outOfStockCount: outOfStockProducts
        },

        // Low stock details
        lowStockAlerts,

        // Revenue breakdown
        revenueBreakdown: revenueBreakdown.map(r => ({
          paymentMethod: r.paymentMethod,
          amount: r._sum.totalAmount || 0
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/charts
 * @desc    Get chart data for dashboard
 * @access  Private
 */
export const getChartData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'week', branchId } = req.query;
    
    const now = new Date();
    let startDate: Date;
    let groupBy: 'day' | 'week' | 'month';

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
        groupBy = 'day';
    }

    const where: any = {
      saleDate: { gte: startDate },
      status: 'completed',
      deletedAt: null,
      ...(branchId && { branchId: parseInt(branchId as string) })
    };

    // Get sales data
    const sales = await prisma.sale.findMany({
      where,
      select: {
        saleDate: true,
        totalAmount: true
      },
      orderBy: { saleDate: 'asc' }
    });

    // Group sales by date
    const salesByDate = new Map<string, number>();
    
    sales.forEach(sale => {
      const date = sale.saleDate.toISOString().split('T')[0];
      const current = salesByDate.get(date) || 0;
      salesByDate.set(date, current + sale.totalAmount.toNumber());
    });

    // Convert to array
    const chartData = Array.from(salesByDate.entries()).map(([date, amount]) => ({
      date,
      amount
    }));

    res.json({
      success: true,
      data: {
        period,
        chartData
      }
    });
  } catch (error) {
    next(error);
  }
};
