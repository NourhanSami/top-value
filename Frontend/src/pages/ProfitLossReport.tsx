import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { ExportMenu } from "@/components/ui/ExportMenu"
import toast from "react-hot-toast"
import api from "@/lib/api"

function toLocalYmd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function monthRangeLocal() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toLocalYmd(first), to: toLocalYmd(last) }
}

const plApi = {
  getData: async (from: string, to: string) => {
    const [salesRes, expensesRes, salesStatsRes, expenseStatsRes] = await Promise.all([
      api.get("/sales", {
        params: {
          dateFrom: from,
          dateTo: to,
          status: "completed",
          limit: 1000,
        },
      }),
      api.get("/expenses", {
        params: {
          dateFrom: from,
          dateTo: to,
          limit: 1000,
        },
      }),
      api.get("/sales/statistics", {
        params: { period: "custom", dateFrom: from, dateTo: to },
      }),
      api.get("/expenses/statistics", {
        params: { period: "custom", dateFrom: from, dateTo: to },
      }),
    ])

    return {
      sales: salesRes.data?.data || [],
      expenses: expensesRes.data?.data || [],
      salesStats: salesStatsRes.data?.data,
      expenseStats: expenseStatsRes.data?.data,
    }
  },
}

export default function ProfitLossReport() {
  const initial = useMemo(() => monthRangeLocal(), [])
  const [dateFrom, setDateFrom] = useState(initial.from)
  const [dateTo, setDateTo] = useState(initial.to)
  const [appliedFrom, setAppliedFrom] = useState(initial.from)
  const [appliedTo, setAppliedTo] = useState(initial.to)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["pl-report", appliedFrom, appliedTo],
    queryFn: () => plApi.getData(appliedFrom, appliedTo),
    enabled: !!appliedFrom && !!appliedTo,
  })

  const applyFilter = () => {
    if (!dateFrom || !dateTo) {
      toast.error("حدد تاريخ البداية والنهاية")
      return
    }
    if (dateFrom > dateTo) {
      toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية")
      return
    }
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
    // refetch happens via queryKey change; force if same range
    if (dateFrom === appliedFrom && dateTo === appliedTo) {
      refetch()
    }
  }

  // Revenue: prefer accurate stats aggregate (not limited by list page size)
  const totalRevenue = Number(data?.salesStats?.totalSales ?? 0) ||
    (data?.sales || []).reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0)

  const totalCOGS = (data?.sales || []).reduce((s: number, sale: any) => {
    return s + (sale.items || []).reduce(
      (si: number, item: any) => si + Number(item.costPrice || 0) * Number(item.quantity || 0),
      0
    )
  }, 0)

  const grossProfit = totalRevenue - totalCOGS
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const totalExpenses = Number(data?.expenseStats?.totalExpenses ?? 0) ||
    (data?.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

  const netProfit = grossProfit - totalExpenses
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const isProfit = netProfit >= 0

  const expenseBreakdown = Object.entries(
    (data?.expenses || []).reduce((acc: Record<string, number>, e: any) => {
      const cat = e.category?.name || "غير مصنف"
      acc[cat] = (acc[cat] || 0) + Number(e.amount || 0)
      return acc
    }, {} as Record<string, number>)
  )

  const exportRows = [
    { item: "إجمالي الإيرادات (المبيعات)", amount: totalRevenue, percent: "100%" },
    { item: "تكلفة البضاعة المباعة (COGS)", amount: totalCOGS, percent: `${totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : 0}%` },
    { item: "مجمل الربح", amount: grossProfit, percent: `${grossMargin.toFixed(1)}%` },
    { item: "المصروفات التشغيلية", amount: totalExpenses, percent: `${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}%` },
    { item: isProfit ? "صافي الربح" : "صافي الخسارة", amount: netProfit, percent: `${netMargin.toFixed(1)}%` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">تقرير الأرباح والخسائر (P&L)</h1>
          <p className="text-sm text-muted-foreground mt-1">ملخص مالي شامل للإيرادات والمصروفات والأرباح</p>
        </div>
        <ExportMenu
          filename={`تقرير-الأرباح-والخسائر-${appliedFrom}-${appliedTo}`}
          title="تقرير الأرباح والخسائر"
          subtitle={`من ${appliedFrom} إلى ${appliedTo}`}
          columns={[
            { key: "item", label: "البند" },
            { key: "amount", label: "المبلغ" },
            { key: "percent", label: "النسبة" },
          ]}
          rows={exportRows}
          showDateFilter={false}
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">من تاريخ</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={applyFilter}
          disabled={isFetching}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
          تحديث
        </button>
        <p className="text-xs text-muted-foreground pb-2">
          الفترة المطبّقة: {appliedFrom} → {appliedTo}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="إجمالي الإيرادات" value={totalRevenue} icon={DollarSign} color="blue" />
            <MetricCard label="مجمل الربح" value={grossProfit} icon={TrendingUp} color="green" badge={`هامش ${grossMargin.toFixed(1)}%`} />
            <MetricCard
              label={isProfit ? "صافي الربح" : "صافي الخسارة"}
              value={netProfit}
              icon={isProfit ? TrendingUp : TrendingDown}
              color={isProfit ? "green" : "red"}
              badge={`${netMargin.toFixed(1)}%`}
            />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-bold text-lg">بيان الأرباح والخسائر</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                الفترة من {appliedFrom} إلى {appliedTo}
                {isFetching ? " — جاري التحديث..." : ""}
              </p>
            </div>
            <div className="p-5 space-y-1">
              <PLRow label="إجمالي الإيرادات (المبيعات المكتملة)" value={totalRevenue} isHeader />
              <PLRow label="تكلفة البضاعة المباعة (COGS)" value={totalCOGS} isNegative />
              <PLRow label="مجمل الربح الإجمالي" value={grossProfit} isSubtotal bold />
              <div className="pt-4">
                <PLRow label="المصروفات التشغيلية" value={totalExpenses} isNegative />
              </div>
              <div className="border-t-2 border-border pt-3 mt-2">
                <PLRow
                  label={isProfit ? "صافي الربح" : "صافي الخسارة"}
                  value={netProfit}
                  isSubtotal
                  bold
                  highlight={isProfit ? "green" : "red"}
                />
              </div>
            </div>
          </div>

          {expenseBreakdown.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold">تفاصيل المصروفات</h3>
              </div>
              <div className="p-5 space-y-2">
                {expenseBreakdown.map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm">{cat}</span>
                    <span className="font-medium text-red-600">{formatCurrency(amt as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color, badge }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color === "red" ? "text-red-600" : color === "green" ? "text-green-600" : "text-foreground"}`}>
        {formatCurrency(Math.abs(value))}
      </p>
      {badge && <p className="text-xs text-muted-foreground mt-1">{badge}</p>}
    </div>
  )
}

function PLRow({ label, value, isHeader, isNegative, isSubtotal, bold, highlight }: any) {
  const colors: Record<string, string> = { green: "text-green-600", red: "text-red-600" }
  return (
    <div className={`flex items-center justify-between py-2 px-2 rounded-lg ${isSubtotal ? "bg-muted/30" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold" : ""} ${isHeader ? "font-bold" : ""}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} text-sm ${isNegative ? "text-red-600" : ""} ${highlight ? colors[highlight] : ""}`}>
        {isNegative ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  )
}
