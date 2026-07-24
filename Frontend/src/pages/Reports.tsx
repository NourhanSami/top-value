import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency } from "@/lib/utils"
import { dashboardService, saleService, productService, customerService, expenseService } from "@/services/api.service"
import { ExportMenu } from "@/components/ui/ExportMenu"
import api from "@/lib/api"

type ReportType = "sales" | "inventory" | "profit" | "customers"
type DateRange = "today" | "yesterday" | "week" | "month" | "year" | "custom"

function toYmd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Resolve UI period → API dateFrom/dateTo */
function resolvePeriodParams(
  dateRange: DateRange,
  customStartDate: string,
  customEndDate: string
): { period: DateRange; dateFrom?: string; dateTo?: string; ready: boolean; label: string } {
  const now = new Date()
  const today = toYmd(now)

  if (dateRange === "custom") {
    if (!customStartDate || !customEndDate) {
      return { period: "custom", ready: false, label: "اختر تاريخ البداية والنهاية" }
    }
    return {
      period: "custom",
      dateFrom: customStartDate,
      dateTo: customEndDate,
      ready: true,
      label: `${customStartDate} → ${customEndDate}`,
    }
  }

  if (dateRange === "today") {
    return { period: "today", dateFrom: today, dateTo: today, ready: true, label: "اليوم" }
  }
  if (dateRange === "yesterday") {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    const yd = toYmd(y)
    return { period: "yesterday", dateFrom: yd, dateTo: yd, ready: true, label: "أمس" }
  }
  if (dateRange === "week") {
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    return { period: "week", dateFrom: toYmd(from), dateTo: today, ready: true, label: "آخر 7 أيام" }
  }
  if (dateRange === "year") {
    const from = new Date(now.getFullYear(), 0, 1)
    return { period: "year", dateFrom: toYmd(from), dateTo: today, ready: true, label: "هذه السنة" }
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { period: "month", dateFrom: toYmd(from), dateTo: today, ready: true, label: "هذا الشهر" }
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales")
  const [dateRange, setDateRange] = useState<DateRange>("month")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const periodParams = useMemo(
    () => resolvePeriodParams(dateRange, customStartDate, customEndDate),
    [dateRange, customStartDate, customEndDate]
  )

  const statsQueryParams = useMemo(() => ({
    period: periodParams.period,
    ...(periodParams.dateFrom ? { dateFrom: periodParams.dateFrom } : {}),
    ...(periodParams.dateTo ? { dateTo: periodParams.dateTo } : {}),
  }), [periodParams])

  const { data: periodSalesRes, isFetching: salesFetching } = useQuery({
    queryKey: ["reports", "top-sales", statsQueryParams],
    queryFn: () => saleService.getStatistics(statsQueryParams),
    enabled: periodParams.ready,
  })

  const { data: productStatsRes } = useQuery({
    queryKey: ["reports", "top-products"],
    queryFn: () => productService.getStatistics(),
  })

  const { data: customerStatsRes } = useQuery({
    queryKey: ["reports", "top-customers"],
    queryFn: () => customerService.getStatistics(),
  })

  const { data: salesExportRes } = useQuery({
    queryKey: ["reports-sales-export", statsQueryParams],
    queryFn: () =>
      api.get("/sales", {
        params: {
          limit: 500,
          dateFrom: periodParams.dateFrom,
          dateTo: periodParams.dateTo,
        },
      }).then((r) => r.data),
    enabled: periodParams.ready,
  })

  const salesExportRows = (salesExportRes?.data || []).map((s: any) => ({
    invoiceNumber: s.invoiceNumber,
    customer: s.customer?.name || "—",
    saleDate: s.saleDate,
    totalAmount: Number(s.totalAmount),
    paidAmount: Number(s.paidAmount),
    paymentMethod: s.paymentMethod,
    paymentStatus: s.paymentStatus,
  }))

  const periodSales = periodSalesRes?.data
  const topSales = Number(periodSales?.totalSales || 0)
  const topOrders = Number(periodSales?.totalOrders || 0)
  const topProducts = Number(productStatsRes?.data?.total || 0)
  const topCustomers = Number(
    customerStatsRes?.data?.activeCustomers ||
    customerStatsRes?.data?.active ||
    customerStatsRes?.data?.total ||
    0
  )

  const reportTabs = [
    { id: "sales" as ReportType, label: "تقرير المبيعات", icon: ShoppingCart },
    { id: "inventory" as ReportType, label: "تقرير المخزون", icon: Package },
    { id: "profit" as ReportType, label: "تقرير الأرباح", icon: TrendingUp },
    { id: "customers" as ReportType, label: "تقرير العملاء", icon: Users },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تقارير تفصيلية لجميع جوانب النظام
            {periodParams.ready && (
              <span className="mr-2 text-primary">— الفترة: {periodParams.label}</span>
            )}
          </p>
        </div>
        <ExportMenu
          filename={`تقرير-${activeReport}-${periodParams.dateFrom || "all"}-${periodParams.dateTo || ""}`}
          title="تقرير المبيعات"
          subtitle={periodParams.label}
          columns={[
            { key: "invoiceNumber", label: "رقم الفاتورة" },
            { key: "customer", label: "العميل" },
            { key: "saleDate", label: "التاريخ" },
            { key: "totalAmount", label: "الإجمالي" },
            { key: "paidAmount", label: "المدفوع" },
            { key: "paymentMethod", label: "طريقة الدفع" },
            { key: "paymentStatus", label: "الحالة" },
          ]}
          rows={salesExportRows}
          dateKey="saleDate"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`إجمالي المبيعات (${periodParams.ready ? periodParams.label : "—"})`}
          value={periodParams.ready ? formatCurrency(topSales) : "—"}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title={`عدد الطلبات (${periodParams.ready ? periodParams.label : "—"})`}
          value={periodParams.ready ? (salesFetching ? "..." : topOrders) : "—"}
          icon={ShoppingCart}
          variant="success"
        />
        <StatCard
          title="منتجات في المخزون"
          value={topProducts}
          icon={Package}
          variant="info"
        />
        <StatCard
          title="عملاء نشطون"
          value={topCustomers}
          icon={Users}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="flat-card p-2 space-y-1">
            {reportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all",
                  activeReport === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flat-card p-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">الفترة الزمنية</h3>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-3"
            >
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="year">هذه السنة</option>
              <option value="custom">تخصيص</option>
            </select>

            {dateRange === "custom" && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">من</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">إلى</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {(!customStartDate || !customEndDate) && (
                  <p className="text-xs text-warning">حدد تاريخ البداية والنهاية لتطبيق التصفية</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flat-card p-6">
            {!periodParams.ready ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                اختر فترة زمنية صالحة لعرض التقرير
              </div>
            ) : (
              <>
                {activeReport === "sales" && <SalesReport params={statsQueryParams} />}
                {activeReport === "inventory" && <InventoryReport />}
                {activeReport === "profit" && <ProfitReport params={statsQueryParams} />}
                {activeReport === "customers" && <CustomersReport />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  destructive: "#ef4444",
  info: "#3b82f6",
  purple: "#a855f7",
}

function SalesReport({ params }: { params: Record<string, string> }) {
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ["sales", "statistics", params],
    queryFn: () => saleService.getStatistics(params),
  })

  const { data: chartDataResponse, isLoading: chartLoading } = useQuery({
    queryKey: ["dashboard", "charts", params],
    queryFn: () => dashboardService.getChartData(params),
  })

  const stats = statsResponse?.data
  const chartData = chartDataResponse?.data?.chartData || []

  const salesChartData = chartData
    .filter((item: any) => Number(item.amount || 0) > 0)
    .map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
      amount: parseFloat(item.amount || 0),
    }))

  const paymentMethodsData = [
    { name: "نقدي", value: Number(stats?.cashSales || stats?.byPaymentMethod?.cash || 0), color: COLORS.success },
    { name: "بطاقة", value: Number(stats?.cardSales || stats?.byPaymentMethod?.card || 0), color: COLORS.info },
    { name: "آجل", value: Number(stats?.creditSales || stats?.byPaymentMethod?.credit || 0), color: COLORS.warning },
    { name: "تحويل", value: Number(stats?.byPaymentMethod?.transfer || 0), color: COLORS.purple },
  ].filter((item) => item.value > 0)

  if (statsLoading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير المبيعات</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(Number(stats?.totalSales || 0))}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">عدد الفواتير</p>
            <p className="text-2xl font-bold text-success">{Number(stats?.totalOrders || 0)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">متوسط الفاتورة</p>
            <p className="text-2xl font-bold text-info">{formatCurrency(Number(stats?.averageOrderValue || 0))}</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">اتجاه المبيعات</h4>
          <div className="p-4 bg-accent rounded-xl">
            {chartLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                    formatter={(value: any) => [formatCurrency(value), "المبيعات"]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="amount" name="المبيعات" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">لا توجد بيانات لعرضها في هذه الفترة</div>
            )}
          </div>
        </div>

        {paymentMethodsData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">طرق الدفع</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie data={paymentMethodsData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InventoryReport() {
  const { data: statsResponse } = useQuery({
    queryKey: ["products", "statistics"],
    queryFn: () => productService.getStatistics(),
  })

  const { data: productsResponse } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productService.getAll({ limit: 100 }),
  })

  const stats = statsResponse?.data
  const products = productsResponse?.data || []

  const stockStatusData = [
    { name: "متوفر", value: Number(stats?.available || stats?.in_stock || 0), color: COLORS.success },
    { name: "مخزون منخفض", value: Number(stats?.low || stats?.low_stock || 0), color: COLORS.warning },
    { name: "نفذ من المخزون", value: Number(stats?.outOfStock || stats?.out_of_stock || 0), color: COLORS.destructive },
  ].filter((item) => item.value > 0)

  const topProductsByValue = products
    .map((p: any) => ({
      name: p.name,
      value: parseFloat(p.costPrice || p.sellingPrice || 0) * (p.stockQuantity || 0),
    }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10)

  const inventoryValue =
    Number(stats?.totalValue || stats?.total_value || 0) ||
    topProductsByValue.reduce((s: number, p: any) => s + p.value, 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير المخزون</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي المنتجات</p>
            <p className="text-2xl font-bold text-primary">{Number(stats?.total || 0)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">مخزون منخفض</p>
            <p className="text-2xl font-bold text-destructive">{Number(stats?.low || stats?.low_stock || 0)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">قيمة المخزون</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(inventoryValue)}</p>
          </div>
        </div>

        {stockStatusData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">حالة المخزون</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie data={stockStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {stockStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {topProductsByValue.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">أعلى المنتجات قيمة في المخزون</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topProductsByValue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <YAxis dataKey="name" type="category" width={150} stroke="#6b7280" style={{ fontSize: "11px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value: any) => [formatCurrency(value), "القيمة"]} />
                  <Bar dataKey="value" name="القيمة" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfitReport({ params }: { params: Record<string, string> }) {
  const { data: salesStatsResponse } = useQuery({
    queryKey: ["sales", "statistics", "profit", params],
    queryFn: () => saleService.getStatistics(params),
  })

  const { data: expenseStatsResponse } = useQuery({
    queryKey: ["expenses", "statistics", params],
    queryFn: () => expenseService.getStatistics(params),
  })

  const { data: chartDataResponse } = useQuery({
    queryKey: ["dashboard", "charts", "profit", params],
    queryFn: () => dashboardService.getChartData(params),
  })

  const salesStats = salesStatsResponse?.data
  const expenseStats = expenseStatsResponse?.data
  const chartData = chartDataResponse?.data?.chartData || []

  const totalRevenue = Number(salesStats?.totalSales || 0)
  const totalExpenses = Number(expenseStats?.totalExpenses || expenseStats?.total_amount || 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0"

  const profitChartData = chartData
    .filter((item: any) => Number(item.amount || 0) > 0)
    .map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
      revenue: parseFloat(item.amount || 0),
    }))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير الأرباح</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي الإيرادات</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">المصروفات</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">صافي الربح</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(netProfit)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">هامش الربح</p>
            <p className="text-2xl font-bold text-info">{profitMargin}%</p>
          </div>
        </div>

        {profitChartData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">اتجاه الإيرادات</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={profitChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">مقارنة الإيرادات والمصروفات</h4>
          <div className="p-4 bg-accent rounded-xl">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { name: "الإيرادات", value: totalRevenue, color: COLORS.success },
                  { name: "المصروفات", value: totalExpenses, color: COLORS.destructive },
                  { name: "صافي الربح", value: netProfit, color: COLORS.primary },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: "12px" }} />
                <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="value" name="المبلغ" radius={[8, 8, 0, 0]}>
                  {[
                    { name: "الإيرادات", value: totalRevenue, color: COLORS.success },
                    { name: "المصروفات", value: totalExpenses, color: COLORS.destructive },
                    { name: "صافي الربح", value: netProfit, color: COLORS.primary },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function CustomersReport() {
  const { data: statsResponse } = useQuery({
    queryKey: ["customers", "statistics"],
    queryFn: () => customerService.getStatistics(),
  })

  const { data: customersResponse } = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => customerService.getAll({ limit: 100 }),
  })

  const stats = statsResponse?.data
  const customers = customersResponse?.data || []

  const tierData = [
    { name: "عادي", value: Number(stats?.regular_customers || Math.max(0, Number(stats?.total || 0) - Number(stats?.vipCount || 0))), color: COLORS.info },
    { name: "فضي", value: Number(stats?.silver_customers || 0), color: "#94a3b8" },
    { name: "ذهبي", value: Number(stats?.gold_customers || 0), color: COLORS.warning },
    { name: "بلاتيني", value: Number(stats?.platinum_customers || 0), color: COLORS.purple },
    { name: "VIP", value: Number(stats?.vipCount || 0), color: COLORS.warning },
  ].filter((item) => item.value > 0)

  const topCustomersByBalance = customers
    .map((c: any) => ({
      name: c.name,
      balance: parseFloat(c.currentBalance ?? c.balance ?? 0),
    }))
    .filter((c: any) => c.balance > 0)
    .sort((a: any, b: any) => b.balance - a.balance)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير العملاء</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي العملاء</p>
            <p className="text-2xl font-bold text-primary">{Number(stats?.total || 0)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">عملاء نشطون</p>
            <p className="text-2xl font-bold text-success">{Number(stats?.activeCustomers || stats?.active || 0)}</p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">عملاء VIP</p>
            <p className="text-2xl font-bold text-warning">
              {Number(stats?.vipCount || 0) + Number(stats?.gold_customers || 0) + Number(stats?.platinum_customers || 0)}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي الأرصدة</p>
            <p className="text-2xl font-bold text-info">{formatCurrency(Number(stats?.totalDebt || stats?.total_balance || 0))}</p>
          </div>
        </div>

        {tierData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">توزيع فئات العملاء</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie data={tierData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {tierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {topCustomersByBalance.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">أعلى العملاء رصيداً</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topCustomersByBalance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <YAxis dataKey="name" type="category" width={150} stroke="#6b7280" style={{ fontSize: "11px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(value: any) => [formatCurrency(value), "الرصيد"]} />
                  <Bar dataKey="balance" name="الرصيد" fill={COLORS.warning} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
