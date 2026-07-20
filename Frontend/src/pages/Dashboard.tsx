import { useState } from "react"
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
import type { LucideIcon } from "lucide-react"

export default function Dashboard() {
  const [autoRefresh] = useState(true)
  const [chartPeriod, setChartPeriod] = useState<"week" | "month" | "year">("week")
  const navigate = useNavigate()

  const { data: statsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardService.getStatistics(),
    refetchInterval: autoRefresh ? 30000 : false,
  })

  const { data: chartResponse } = useQuery({
    queryKey: ["dashboard-charts", chartPeriod],
    queryFn: () => dashboardService.getChartData({ period: chartPeriod }),
  })

  const stats = statsResponse?.data
  const chartData: { date: string; amount: number }[] = chartResponse?.data?.chartData || []

  const salesThisMonth = Number(stats?.sales?.thisMonth || 0)
  const salesToday = Number(stats?.sales?.today || 0)
  const totalOrders = Number(stats?.sales?.totalOrders || 0)
  const todayOrders = Number(stats?.sales?.todayOrders || 0)
  const productsTotal = Number(stats?.products?.total || 0)
  const needsReorder = Number(stats?.products?.needsReorder || 0)
  const customersTotal = Number(stats?.customers?.total || 0)
  const newCustomers = Number(stats?.customers?.newThisWeek || 0)
  const topProductsRevenueSum = (stats?.topProducts || []).reduce(
    (sum: number, p: any) => sum + Number(p.totalRevenue || 0),
    0
  ) || 1

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
            onClick={() => refetch()}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="مبيعات اليوم"
          value={formatCurrency(salesToday)}
          icon={Wallet}
          variant="primary"
          subtitle={`${todayOrders} فاتورة اليوم`}
        />

        <StatCard
          title="مبيعات الشهر"
          value={formatCurrency(salesThisMonth)}
          icon={ShoppingCart}
          variant="success"
          change={{
            value: Number(stats?.sales?.salesChange || 0),
            label: "من الشهر الماضي",
          }}
          subtitle={`${totalOrders} طلب هذا الشهر`}
        />

        <StatCard
          title="المنتجات في المخزون"
          value={productsTotal}
          icon={Package}
          variant="info"
          subtitle={`تحتاج تجديد: ${needsReorder}`}
        />

        <StatCard
          title="العملاء النشطون"
          value={customersTotal}
          icon={Users}
          variant="warning"
          subtitle={`الجدد هذا الأسبوع: ${newCustomers}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flat-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">آخر المبيعات</h2>
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
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">الرقم</th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">العميل</th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">المبلغ</th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">طريقة الدفع</th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {!stats?.recentSales?.length ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      لا توجد مبيعات بعد
                    </td>
                  </tr>
                ) : (
                  stats.recentSales.map((sale: any) => (
                    <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="text-sm text-foreground py-4 px-4">#{sale.invoiceNumber}</td>
                      <td className="text-sm text-foreground py-4 px-4">{sale.customer?.name || "عميل نقدي"}</td>
                      <td className="text-sm text-foreground py-4 px-4">{formatCurrency(sale.totalAmount)}</td>
                      <td className="text-sm text-foreground py-4 px-4">
                        {sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'آجل'}
                      </td>
                      <td className="text-sm text-muted-foreground py-4 px-4">{formatDate(sale.saleDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flat-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton icon={User} label="إسناد مندوب لمخزن" onClick={() => navigate('/users')} />
            <QuickActionButton icon={Package} label="إضافة منتج" onClick={() => navigate('/products')} />
            <QuickActionButton icon={Users} label="إضافة عميل" onClick={() => navigate('/customers')} />
            <QuickActionButton icon={BarChart3} label="تقرير سريع" onClick={() => navigate('/reports')} />
            <QuickActionButton icon={ArrowLeftRight} label="نقل مخزون" onClick={() => navigate('/inventory-transfers')} />
            <QuickActionButton icon={Warehouse} label="إضافة مخزن" onClick={() => navigate('/branches')} />
          </div>
        </div>
      </div>

      <div className="flat-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">المنتجات الأكثر مبيعاً</h2>
          <button onClick={() => navigate('/products')} className="text-sm text-primary hover:text-primary/80 transition-colors">
            عرض الكل ←
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">الرقم</th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">المنتج</th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">الكمية</th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">الإيرادات</th>
                <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {!stats?.topProducts?.length ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">لا توجد مبيعات هذا الشهر</td>
                </tr>
              ) : (
                stats.topProducts.map((item: any, index: number) => {
                  const revenue = Number(item.totalRevenue || 0)
                  const percentage = ((revenue / topProductsRevenueSum) * 100).toFixed(1)
                  return (
                    <tr key={item.product?.id || index} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="text-sm text-foreground py-4 px-4">{index + 1}</td>
                      <td className="text-sm text-foreground py-4 px-4">{item.product?.name || 'غير معروف'}</td>
                      <td className="text-sm text-foreground py-4 px-4">{Number(item.quantitySold || 0)}</td>
                      <td className="text-sm text-foreground py-4 px-4">{formatCurrency(revenue)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-sm text-muted-foreground min-w-[3rem]">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flat-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">مبيعات الفترة</h2>
          <div className="flex gap-2">
            {(["week", "month", "year"] as const).map(p => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                  chartPeriod === p ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                {p === "week" ? "أسبوع" : p === "month" ? "شهر" : "سنة"}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">لا توجد بيانات للفترة المحددة</div>
        ) : (
          <div className="flex items-end gap-1.5 h-40 w-full" aria-label="رسم بياني للمبيعات">
            {chartData.map((d, i) => {
              const maxVal = Math.max(...chartData.map(x => Number(x.amount) || 0), 1)
              const amount = Number(d.amount) || 0
              const pct = amount > 0 ? Math.max((amount / maxVal) * 100, 6) : 2
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full min-w-0">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={cn("w-full rounded-t-md transition-all", amount > 0 ? "bg-primary hover:bg-primary/80" : "bg-muted")}
                      style={{ height: `${pct}%` }}
                      title={`${d.date}: ${formatCurrency(amount)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                    {d.date.length > 7 ? d.date.slice(5) : d.date}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

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
