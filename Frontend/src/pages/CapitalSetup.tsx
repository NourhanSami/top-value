import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Wallet, Package, Users, Building2, TrendingUp, TrendingDown, Loader2, Banknote } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

const capitalApi = {
  getSummary: () => api.get("/capital/summary").then((r) => r.data),
  initialize: (data: { cashAmount: number; notes?: string }) =>
    api.post("/capital/initialize", data).then((r) => r.data),
}

export default function CapitalSetup() {
  const queryClient = useQueryClient()
  const [cashAmount, setCashAmount] = useState("")
  const [notes, setNotes] = useState("")

  const { data: res, isLoading } = useQuery({
    queryKey: ["capital-summary"],
    queryFn: capitalApi.getSummary,
  })

  const initMutation = useMutation({
    mutationFn: capitalApi.initialize,
    onSuccess: () => {
      toast.success("تم تهيئة رأس المال بنجاح")
      queryClient.invalidateQueries({ queryKey: ["capital-summary"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل التهيئة"),
  })

  const data = res?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data?.initialized) {
    const preview = data?.preview || {}
    const estimated =
      Number(preview.inventoryValue || 0) +
      (parseFloat(cashAmount) || 0) +
      Number(preview.netDebt || 0)

    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">تهيئة رأس المال</h1>
          <p className="text-sm text-muted-foreground mt-1">
            أدخل النقدية الفعلية في الدرج لبدء تتبع رأس المال والأرباح
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="w-4 h-4" /> قيمة المخزون
            </div>
            <p className="text-xl font-bold">{formatCurrency(Number(preview.inventoryValue || 0))}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" /> أرصدة بنكية
            </div>
            <p className="text-xl font-bold">{formatCurrency(Number(preview.bankBalance || 0))}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" /> ديون العملاء
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(Number(preview.customerDebts || 0))}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" /> مستحقات الموردين
            </div>
            <p className="text-xl font-bold text-destructive">{formatCurrency(Number(preview.supplierDebts || 0))}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">النقدية الفعلية في الدرج *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-12 px-4 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-12 px-4 border border-border rounded-xl bg-background text-sm focus:outline-none"
            />
          </div>
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground">رأس المال الابتدائي المتوقع</p>
            <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(estimated)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              = المخزون + النقدية + (ديون العملاء − مستحقات الموردين)
            </p>
          </div>
          <button
            onClick={() => {
              const amount = parseFloat(cashAmount)
              if (isNaN(amount) || amount < 0) return toast.error("أدخل مبلغ النقدية")
              initMutation.mutate({ cashAmount: amount, notes: notes || undefined })
            }}
            disabled={initMutation.isPending}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {initMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            تهيئة رأس المال
          </button>
        </div>
      </div>
    )
  }

  const current = data.current
  const profit = Number(current?.profitLoss || 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">رأس المال</h1>
        <p className="text-sm text-muted-foreground mt-1">
          تمت التهيئة في {data.initializationDate ? formatDate(data.initializationDate) : "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Wallet className="w-4 h-4" /> رأس المال الابتدائي
          </div>
          <p className="text-2xl font-bold">{formatCurrency(Number(data.startingCapital || 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Banknote className="w-4 h-4" /> الأصول الحالية
          </div>
          <p className="text-2xl font-bold">{formatCurrency(Number(current?.currentAssets || 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {profit >= 0 ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
            الربح / الخسارة
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(Math.abs(profit))} {profit >= 0 ? "(ربح)" : "(خسارة)"}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-4">تفصيل الأصول</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">قيمة المخزون</span>
            <span className="font-medium">{formatCurrency(Number(current?.inventoryValue || 0))}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">نقدية الدرج (عند التهيئة)</span>
            <span className="font-medium">{formatCurrency(Number(current?.cashAmount || 0))}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">أرصدة بنكية</span>
            <span className="font-medium">{formatCurrency(Number(current?.bankBalance || 0))}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">ديون العملاء</span>
            <span className="font-medium text-success">{formatCurrency(Number(current?.customerDebts || 0))}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">مستحقات الموردين</span>
            <span className="font-medium text-destructive">{formatCurrency(Number(current?.supplierDebts || 0))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
