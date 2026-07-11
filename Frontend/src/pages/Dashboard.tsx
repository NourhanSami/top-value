import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Wallet,
  ShoppingCart,
  Package,
  Users,
  User,
  BarChart3,
  ArrowLeftRight,
  Warehouse,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { IconBox } from "@/components/ui/IconBox"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { dashboardService } from "@/services/api.service"
import type { DashboardStats } from "@/types"

export default function Dashboard() {
  const [autoRefresh] = useState(true)
  const navigate = useNavigate()

  // Fetch dashboard data
  const { data: statsResponse, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardService.getStatistics(),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  })

  const stats = statsResponse?.data

  // Disable auto-refresh when dialog is open
  useEffect(() => {
    // You can add event listeners for dialogs here
    return () => {
      // Cleanup
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-foreground font-semibold mb-2">فشل تحميل البيانات</p>
          <p className="text-sm text-muted-foreground mb-4">حدث خطأ أثناء تحميل بيانات لوحة التحكم</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={formatCurrency(stats?.sales?.thisMonth || 0)}
          icon={Wallet}
          variant="primary"
          change={{
            value: stats?.sales?.salesChange || 0,
            label: "من الشهر الماضي",
          }}
        />

        <StatCard
          title="عدد الطلبات"
          value={stats?.sales?.totalOrders || 0}
          icon={ShoppingCart}
          variant="success"
          change={{
            value: stats?.sales?.ordersChange || 0,
            label: "من الشهر الماضي",
          }}
        />

        <StatCard
          title="المنتجات في المخزون"
          value={stats?.products?.total || 0}
          icon={Package}
          variant="info"
          subtitle={`تحتاج تجديد: ${stats?.products?.needsReorder || 0}`}
        />

        <StatCard
          title="العملاء النشطون"
          value={stats?.customers?.total || 0}
          icon={Users}
          variant="warning"
          subtitle={`الجدد هذا الأسبوع: ${stats?.customers?.newThisWeek || 0}`}
        />
      </div>

      {/* Recent Sales & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 flat-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              آخر المبيعات
            </h2>
            <button 
              onClick={() => navigate('/sales')}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              عرض الكل ←
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الرقم
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    العميل
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المبلغ
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    طريقة الدفع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    التاريخ
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentSales?.map((sale: any) => (
                  <tr
                    key={sale.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="text-sm text-foreground py-4 px-4">
                      #{sale.invoiceNumber}
                    </td>
                    <td className="text-sm text-foreground py-4 px-4">
                      {sale.customer?.name || "عميل نقدي"}
                    </td>
                    <td className="text-sm text-foreground py-4 px-4">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="text-sm text-foreground py-4 px-4">
                      {sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'آجل'}
                    </td>
                    <td className="text-sm text-muted-foreground py-4 px-4">
                      {formatDate(sale.saleDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flat-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            إجراءات سريعة
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              icon={User}
              label="إسناد مندوب لمخزن"
              onClick={() => navigate('/users')}
            />
            <QuickActionButton
              icon={Package}
              label="إضافة منتج"
              onClick={() => navigate('/products')}
            />
            <QuickActionButton
              icon={Users}
              label="إضافة عميل"
              onClick={() => navigate('/customers')}
            />
            <QuickActionButton
              icon={BarChart3}
              label="تقرير سريع"
              onClick={() => navigate('/reports')}
            />
            <QuickActionButton
              icon={ArrowLeftRight}
              label="نقل مخزون"
              onClick={() => navigate('/products')}
            />
            <QuickActionButton
              icon={Warehouse}
              label="إضافة مخزن"
              onClick={() => navigate('/branches')}
            />
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="flat-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            المنتجات الأكثر مبيعاً
          </h2>
          <button 
            onClick={() => navigate('/products')}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            عرض الكل ←
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                  الرقم
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                  المنتج
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                  الكمية
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                  الإيرادات
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                  النسبة
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.topProducts?.map((item: any, index: number) => {
                const totalRevenue = stats?.sales?.thisMonth || 1;
                const percentage = ((item.totalRevenue / totalRevenue) * 100).toFixed(1);
                
                return (
                  <tr
                    key={item.product?.id || index}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="text-sm text-foreground py-4 px-4">
                      {index + 1}
                    </td>
                    <td className="text-sm text-foreground py-4 px-4">
                      {item.product?.name || 'غير معروف'}
                    </td>
                    <td className="text-sm text-foreground py-4 px-4">
                      {item.quantitySold}
                    </td>
                    <td className="text-sm text-foreground py-4 px-4">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground min-w-[3rem]">
                          {percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import type { LucideIcon } from "lucide-react"

interface QuickActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flat-card hover-lift p-4 flex flex-col items-center justify-center gap-2 text-center group"
    >
      <IconBox
        icon={Icon}
        variant="primary"
        size="sm"
        iconSize={20}
        className="group-hover:scale-110 transition-transform"
      />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  )
}
