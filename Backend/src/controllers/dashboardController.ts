import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

const toNum = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  return Number(v) || 0;
};

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard statistics
 * @access  Private
 */
export const getDashboardStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.query;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const previousMonthEnd = new Date(monthStart.getTime() - 1);

    const where: any = {
      deletedAt: null,
      ...(branchId && { branchId: parseInt(branchId as string) })
    };

    const [todaySales, monthSales, previousMonthSales, allTimeSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { ...where, saleDate: { gte: todayStart }, status: 'completed' },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: { ...where, saleDate: { gte: monthStart }, status: 'completed' },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: {
          ...where,
          saleDate: { gte: previousMonthStart, lte: previousMonthEnd },
          status: 'completed'
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { totalAmount: true },
        _count: true
      })
    ]);

    const monthTotal = toNum(monthSales._sum.totalAmount);
    const prevMonthTotal = toNum(previousMonthSales._sum.totalAmount);
    const salesChange = prevMonthTotal > 0
      ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100
      : (monthTotal > 0 ? 100 : 0);

    const ordersChange = previousMonthSales._count > 0
      ? ((monthSales._count - previousMonthSales._count) / previousMonthSales._count) * 100
      : (monthSales._count > 0 ? 100 : 0);

    const products = await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: { stockQuantity: true, minStockLevel: true }
    });

    const lowStockProducts = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStockLevel).length;
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length;

    const [totalCustomers, newCustomersThisWeek, vipCustomers] = await Promise.all([
      prisma.customer.count({ where: { isActive: true, deletedAt: null } }),
      prisma.customer.count({
        where: { createdAt: { gte: weekAgo }, isActive: true, deletedAt: null }
      }),
      prisma.customer.count({
        where: {
          customerTier: { in: ['gold', 'platinum'] },
          isActive: true,
          deletedAt: null
        }
      })
    ]);

    const recentSales = await prisma.sale.findMany({
      where: { ...where, status: 'completed' },
      take: 10,
      orderBy: { saleDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } }
      }
    });

    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: { ...where, saleDate: { gte: monthStart }, status: 'completed' }
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
      quantitySold: toNum(p._sum.quantity),
      totalRevenue: toNum(p._sum.totalAmount)
    }));

    const pendingExpenses = await prisma.expense.count({
      where: { ...where, status: 'pending' }
    }).catch(() => 0);

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

    const revenueBreakdown = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: { ...where, saleDate: { gte: monthStart }, status: 'completed' },
      _sum: { totalAmount: true }
    });

    res.json({
      success: true,
      data: {
        sales: {
          today: toNum(todaySales._sum.totalAmount),
          todayOrders: todaySales._count,
          thisMonth: monthTotal,
          allTime: toNum(allTimeSales._sum.totalAmount),
          salesChange: parseFloat(salesChange.toFixed(2)),
          totalOrders: monthSales._count,
          allTimeOrders: allTimeSales._count,
          ordersChange: parseFloat(ordersChange.toFixed(2))
        },
        products: {
          total: products.length,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
          needsReorder: lowStockProducts + outOfStockProducts
        },
        customers: {
          total: totalCustomers,
          newThisWeek: newCustomersThisWeek,
          vip: vipCustomers
        },
        recentSales: recentSales.map(sale => ({
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          customer: sale.customer,
          totalAmount: toNum(sale.totalAmount),
          paymentMethod: sale.paymentMethod,
          saleDate: sale.saleDate,
          cashier: sale.user
        })),
        topProducts: topProductsWithDetails,
        alerts: {
          pendingExpenses,
          lowStockCount: lowStockProducts,
          outOfStockCount: outOfStockProducts
        },
        lowStockAlerts: lowStockAlertsRaw,
        revenueBreakdown: revenueBreakdown.map(r => ({
          paymentMethod: r.paymentMethod,
          amount: toNum(r._sum.totalAmount)
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
    now.setHours(23, 59, 59, 999);
    let startDate: Date;
    let groupBy: 'day' | 'month' = 'day';

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'day';
    }

    const where: any = {
      saleDate: { gte: startDate, lte: now },
      status: 'completed',
      deletedAt: null,
      ...(branchId && { branchId: parseInt(branchId as string) })
    };

    const sales = await prisma.sale.findMany({
      where,
      select: { saleDate: true, totalAmount: true },
      orderBy: { saleDate: 'asc' }
    });

    const salesByKey = new Map<string, number>();
    sales.forEach(sale => {
      const d = sale.saleDate;
      const key = groupBy === 'month'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().split('T')[0];
      salesByKey.set(key, (salesByKey.get(key) || 0) + toNum(sale.totalAmount));
    });

    const chartData: { date: string; amount: number }[] = [];
    if (groupBy === 'month') {
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cursor <= endMonth) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        chartData.push({ date: key, amount: salesByKey.get(key) || 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const cursor = new Date(startDate);
      while (cursor <= now) {
        const key = cursor.toISOString().split('T')[0];
        chartData.push({ date: key, amount: salesByKey.get(key) || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    res.json({
      success: true,
      data: { period, chartData }
    });
  } catch (error) {
    next(error);
  }
};
