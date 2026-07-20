import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  Download,
  FileText,
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  Filter,
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
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { dashboardService, saleService, productService, customerService, expenseService } from "@/services/api.service"
import * as XLSX from "xlsx"
import api from "@/lib/api"

type ReportType = "sales" | "inventory" | "profit" | "customers"
type DateRange = "today" | "yesterday" | "week" | "month" | "year" | "custom"

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportType>("sales")
  const [dateRange, setDateRange] = useState<DateRange>("month")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  // Fetch dashboard statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["dashboard", "statistics"],
    queryFn: () => dashboardService.getStatistics(),
  })

  const stats = statsResponse?.data

  const reportTabs = [
    { id: "sales" as ReportType, label: "تقرير المبيعات", icon: ShoppingCart },
    { id: "inventory" as ReportType, label: "تقرير المخزون", icon: Package },
    { id: "profit" as ReportType, label: "تقرير الأرباح", icon: TrendingUp },
    { id: "customers" as ReportType, label: "تقرير العملاء", icon: Users },
  ]

  const handleExportPDF = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    try {
      const salesRes = await api.get('/sales', { params: { limit: 999 } })
      const sales = salesRes.data.data || []
      const rows = [
        ["رقم الفاتورة", "العميل", "التاريخ", "الإجمالي", "المدفوع", "طريقة الدفع", "الحالة"],
        ...sales.map((s: any) => [s.invoiceNumber, s.customer?.name || "—", new Date(s.saleDate).toLocaleDateString('ar-EG'), Number(s.totalAmount), Number(s.paidAmount), s.paymentMethod, s.paymentStatus]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "المبيعات")
      XLSX.writeFile(wb, `تقرير-المبيعات-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch {
      alert("خطأ أثناء التصدير")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تقارير تفصيلية لجميع جوانب النظام
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 h-10 bg-success text-success-foreground rounded-xl hover:bg-success/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 h-10 bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">PDF</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={formatCurrency(stats?.total_sales || 0)}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title="عدد الطلبات"
          value={stats?.total_orders || 0}
          icon={ShoppingCart}
          variant="success"
        />
        <StatCard
          title="منتجات في المخزون"
          value={stats?.total_products || 0}
          icon={Package}
          variant="info"
        />
        <StatCard
          title="عملاء نشطون"
          value={stats?.active_customers || 0}
          icon={Users}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Type Tabs */}
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

          {/* Date Range Filter */}
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    من
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    إلى
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3">
          <div className="flat-card p-6">
            {activeReport === "sales" && <SalesReport dateRange={dateRange} />}
            {activeReport === "inventory" && <InventoryReport />}
            {activeReport === "profit" && <ProfitReport dateRange={dateRange} />}
            {activeReport === "customers" && <CustomersReport />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Colors for charts
const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  destructive: "#ef4444",
  info: "#3b82f6",
  purple: "#a855f7",
}

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.purple, COLORS.destructive]

// Sales Report Component
function SalesReport({ dateRange }: { dateRange: DateRange }) {
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ["sales", "statistics", dateRange],
    queryFn: () => saleService.getStatistics({ period: dateRange }),
  })

  const { data: chartDataResponse, isLoading: chartLoading } = useQuery({
    queryKey: ["dashboard", "charts", dateRange],
    queryFn: () => dashboardService.getChartData({ period: dateRange }),
  })

  const stats = statsResponse?.data
  const chartData = chartDataResponse?.data?.chartData || []

  // Transform chart data for Recharts
  const salesChartData = chartData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    amount: parseFloat(item.amount || 0)
  }))

  // Payment methods breakdown
  const paymentMethodsData = [
    { name: "نقدي", value: stats?.cash_sales || 0, color: COLORS.success },
    { name: "بطاقة", value: stats?.card_sales || 0, color: COLORS.info },
    { name: "آجل", value: stats?.credit_sales || 0, color: COLORS.warning },
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير المبيعات</h3>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي المبيعات</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(stats?.total_amount || 0)}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">عدد الفواتير</p>
            <p className="text-2xl font-bold text-success">
              {stats?.total_invoices || 0}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">متوسط الفاتورة</p>
            <p className="text-2xl font-bold text-info">
              {formatCurrency(stats?.average_invoice || 0)}
            </p>
          </div>
        </div>

        {/* Sales Trend Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">اتجاه المبيعات</h4>
          <div className="p-4 bg-accent rounded-xl">
            {chartLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => [formatCurrency(value), 'المبيعات']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="المبيعات"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                لا توجد بيانات لعرضها
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Chart */}
        {paymentMethodsData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">طرق الدفع</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
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

// Inventory Report Component
function InventoryReport() {
  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ["products", "statistics"],
    queryFn: () => productService.getStatistics(),
  })

  const { data: productsResponse } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productService.getAll({ limit: 100 }),
  })

  const stats = statsResponse?.data
  const products = productsResponse?.data || []

  // Stock status breakdown
  const stockStatusData = [
    { name: "متوفر", value: (stats?.in_stock || 0), color: COLORS.success },
    { name: "مخزون منخفض", value: (stats?.low_stock || 0), color: COLORS.warning },
    { name: "نفذ من المخزون", value: (stats?.out_of_stock || 0), color: COLORS.destructive },
  ].filter(item => item.value > 0)

  // Top products by stock value
  const topProductsByValue = products
    .map((p: any) => ({
      name: p.name,
      value: parseFloat(p.sellingPrice || 0) * (p.stockQuantity || 0)
    }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير المخزون</h3>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي المنتجات</p>
            <p className="text-2xl font-bold text-primary">
              {stats?.total || 0}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">مخزون منخفض</p>
            <p className="text-2xl font-bold text-destructive">
              {stats?.low_stock || 0}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">قيمة المخزون</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(stats?.total_value || 0)}
            </p>
          </div>
        </div>

        {/* Stock Status Chart */}
        {stockStatusData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">حالة المخزون</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
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

        {/* Top Products by Value */}
        {topProductsByValue.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">أعلى المنتجات قيمة في المخزون</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topProductsByValue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" width={150} stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => [formatCurrency(value), 'القيمة']}
                  />
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

// Profit Report Component
function ProfitReport({ dateRange }: { dateRange: DateRange }) {
  const { data: salesStatsResponse } = useQuery({
    queryKey: ["sales", "statistics", dateRange],
    queryFn: () => saleService.getStatistics({ period: dateRange }),
  })

  const { data: expenseStatsResponse } = useQuery({
    queryKey: ["expenses", "statistics", dateRange],
    queryFn: () => expenseService.getStatistics({ period: dateRange }),
  })

  const { data: chartDataResponse } = useQuery({
    queryKey: ["dashboard", "charts", dateRange],
    queryFn: () => dashboardService.getChartData({ period: dateRange }),
  })

  const salesStats = salesStatsResponse?.data
  const expenseStats = expenseStatsResponse?.data
  const chartData = chartDataResponse?.data?.chartData || []

  const totalRevenue = parseFloat(salesStats?.total_amount || 0)
  const totalExpenses = parseFloat(expenseStats?.total_amount || 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

  // Transform chart data
  const profitChartData = chartData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(item.amount || 0),
    // We don't have daily expenses, so this is simplified
    profit: parseFloat(item.amount || 0) * 0.7 // Assuming 30% cost ratio
  }))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير الأرباح</h3>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي الإيرادات</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">المصروفات</p>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">صافي الربح</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(netProfit)}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">هامش الربح</p>
            <p className="text-2xl font-bold text-info">
              {profitMargin}%
            </p>
          </div>
        </div>

        {/* Profit Trend Chart */}
        {profitChartData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">اتجاه الأرباح</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={profitChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="الإيرادات"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="الربح"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: COLORS.success, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Revenue vs Expenses Comparison */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">مقارنة الإيرادات والمصروفات</h4>
          <div className="p-4 bg-accent rounded-xl">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[
                { name: 'الإيرادات', value: totalRevenue, color: COLORS.success },
                { name: 'المصروفات', value: totalExpenses, color: COLORS.destructive },
                { name: 'صافي الربح', value: netProfit, color: COLORS.primary },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Bar dataKey="value" name="المبلغ" radius={[8, 8, 0, 0]}>
                  {[
                    { name: 'الإيرادات', value: totalRevenue, color: COLORS.success },
                    { name: 'المصروفات', value: totalExpenses, color: COLORS.destructive },
                    { name: 'صافي الربح', value: netProfit, color: COLORS.primary },
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

// Customers Report Component
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

  // Customer tier distribution
  const tierData = [
    { name: "عادي", value: stats?.regular_customers || 0, color: COLORS.info },
    { name: "فضي", value: stats?.silver_customers || 0, color: "#94a3b8" },
    { name: "ذهبي", value: stats?.gold_customers || 0, color: COLORS.warning },
    { name: "بلاتيني", value: stats?.platinum_customers || 0, color: COLORS.purple },
  ].filter(item => item.value > 0)

  // Top customers by balance
  const topCustomersByBalance = customers
    .map((c: any) => ({
      name: c.name,
      balance: parseFloat(c.balance || 0)
    }))
    .filter((c: any) => c.balance > 0)
    .sort((a: any, b: any) => b.balance - a.balance)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير العملاء</h3>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي العملاء</p>
            <p className="text-2xl font-bold text-primary">
              {stats?.total || 0}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">عملاء نشطون</p>
            <p className="text-2xl font-bold text-success">
              {stats?.active || 0}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">عملاء VIP</p>
            <p className="text-2xl font-bold text-warning">
              {(stats?.gold_customers || 0) + (stats?.platinum_customers || 0)}
            </p>
          </div>
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">إجمالي الأرصدة</p>
            <p className="text-2xl font-bold text-info">
              {formatCurrency(stats?.total_balance || 0)}
            </p>
          </div>
        </div>

        {/* Customer Tier Distribution */}
        {tierData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">توزيع فئات العملاء</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie
                    data={tierData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
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

        {/* Top Customers by Balance */}
        {topCustomersByBalance.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">أعلى العملاء رصيداً</h4>
            <div className="p-4 bg-accent rounded-xl">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topCustomersByBalance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" width={150} stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => [formatCurrency(value), 'الرصيد']}
                  />
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
