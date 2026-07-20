import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Wallet, Landmark, Banknote, AlertTriangle, CheckCircle2, Loader2,
  Lock, Unlock, ShoppingCart, TrendingUp,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ExportMenu } from "@/components/ui/ExportMenu"
import api from "@/lib/api"
import toast from "react-hot-toast"
import { useAuth } from "@/contexts/AuthContext"
import { branchService } from "@/services/api.service"

const treasuryApi = {
  overview: (branchId?: number) =>
    api.get("/treasury/overview", { params: { branchId } }).then((r) => r.data),
  sessions: (branchId?: number) =>
    api.get("/treasury/sessions", { params: { branchId, limit: 15 } }).then((r) => r.data),
  open: (data: any) => api.post("/treasury/sessions/open", data).then((r) => r.data),
  close: (id: number, data: any) => api.post(`/treasury/sessions/${id}/close`, data).then((r) => r.data),
  checkCapacity: (data: { amount: number; branchId?: number }) =>
    api.post("/treasury/check-capacity", data).then((r) => r.data),
}

export default function TreasuryPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [branchId, setBranchId] = useState<number>(user?.branch_id || 1)
  const [openingCash, setOpeningCash] = useState("")
  const [openingNetwork, setOpeningNetwork] = useState("0")
  const [countedCash, setCountedCash] = useState("")
  const [countedNetwork, setCountedNetwork] = useState("0")
  const [closeNotes, setCloseNotes] = useState("")
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [capacityResult, setCapacityResult] = useState<any>(null)

  const { data: branchesRes } = useQuery({
    queryKey: ["branches-list"],
    queryFn: () => branchService.getAll(),
  })
  const branches: any[] = branchesRes?.data || []

  const { data: overviewRes, isLoading } = useQuery({
    queryKey: ["treasury-overview", branchId],
    queryFn: () => treasuryApi.overview(branchId),
  })
  const { data: sessionsRes } = useQuery({
    queryKey: ["treasury-sessions", branchId],
    queryFn: () => treasuryApi.sessions(branchId),
  })

  const overview = overviewRes?.data
  const liquidity = overview?.liquidity
  const openSession = overview?.openSession
  const sessions = sessionsRes?.data || []

  const openMutation = useMutation({
    mutationFn: treasuryApi.open,
    onSuccess: () => {
      toast.success("تم فتح الخزنة")
      queryClient.invalidateQueries({ queryKey: ["treasury-overview"] })
      queryClient.invalidateQueries({ queryKey: ["treasury-sessions"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل فتح الخزنة"),
  })

  const closeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => treasuryApi.close(id, data),
    onSuccess: (res) => {
      const d = res.data
      const cashDef = Number(d.cashDeficit || 0)
      const netDef = Number(d.networkDeficit || 0)
      if (cashDef > 0 || netDef > 0) {
        toast.error(`تم الإغلاق مع عجز — كاش: ${cashDef.toFixed(2)} / شبكة: ${netDef.toFixed(2)}`)
      } else if (cashDef < 0 || netDef < 0) {
        toast.success("تم الإغلاق — يوجد فائض عن المتوقع")
      } else {
        toast.success("تم إغلاق الخزنة بدون عجز")
      }
      queryClient.invalidateQueries({ queryKey: ["treasury-overview"] })
      queryClient.invalidateQueries({ queryKey: ["treasury-sessions"] })
      setCountedCash("")
      setCountedNetwork("0")
      setCloseNotes("")
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل إغلاق الخزنة"),
  })

  const checkCapacity = async () => {
    const amount = parseFloat(purchaseAmount)
    if (Number.isNaN(amount) || amount < 0) return toast.error("أدخل مبلغ الشراء")
    try {
      const res = await treasuryApi.checkCapacity({ amount, branchId })
      setCapacityResult(res.data)
    } catch (e: any) {
      toast.error(e.response?.data?.message || "فشل التحقق")
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">الخزنة والسيولة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تتبع الكاش والشبكة والعجز، ومعرفة قدرة الشراء من السيولة المتاحة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename={`جلسات-خزنة-${new Date().toISOString().slice(0, 10)}`}
            title="سجل جلسات الخزنة"
            columns={[
              { key: "openedAt", label: "التاريخ" },
              { key: "status", label: "الحالة" },
              { key: "openingCash", label: "افتتاح كاش" },
              { key: "expectedCash", label: "متوقع كاش" },
              { key: "countedCash", label: "جرد كاش" },
              { key: "cashDeficit", label: "عجز كاش" },
              { key: "networkDeficit", label: "عجز شبكة" },
              { key: "openedBy", label: "بواسطة" },
            ]}
            rows={sessions.map((s: any) => ({
              openedAt: s.openedAt,
              status: s.status === "open" ? "مفتوحة" : "مغلقة",
              openingCash: Number(s.openingCash || 0),
              expectedCash: Number(s.expectedCash || 0),
              countedCash: Number(s.countedCash || 0),
              cashDeficit: Number(s.cashDeficit || 0),
              networkDeficit: Number(s.networkDeficit || 0),
              openedBy: s.openedBy?.name || s.user?.name || "",
            }))}
            dateKey="openedAt"
          />
          <select
            value={branchId}
            onChange={(e) => setBranchId(parseInt(e.target.value))}
            className="h-10 px-3 border border-border rounded-xl bg-background text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            {!branches.length && <option value={1}>الفرع الرئيسي</option>}
          </select>
        </div>
      </div>

      {/* Liquidity cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Banknote className="w-4 h-4" /> كاش الخزنة
          </div>
          <p className="text-2xl font-bold">{formatCurrency(Number(liquidity?.cashBalance || 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Landmark className="w-4 h-4" /> شبكة / بطاقات
          </div>
          <p className="text-2xl font-bold">{formatCurrency(Number(liquidity?.networkBalance || 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Wallet className="w-4 h-4" /> أرصدة بنكية
          </div>
          <p className="text-2xl font-bold">{formatCurrency(Number(liquidity?.bankBalance || 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" /> إجمالي السيولة
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(Number(liquidity?.totalLiquidity || 0))}</p>
          <p className="text-xs text-muted-foreground mt-1">
            قدرة الشراء: {formatCurrency(Number(liquidity?.availableForPurchase || 0))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session open/close */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            {openSession ? <Unlock className="w-5 h-5 text-success" /> : <Lock className="w-5 h-5" />}
            جلسة الخزنة
          </h2>

          {!openSession ? (
            <>
              <p className="text-sm text-muted-foreground">لا توجد جلسة مفتوحة. افتح الخزنة لبدء اليوم.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">افتتاح كاش</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="0"
                    className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">افتتاح شبكة</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingNetwork}
                    onChange={(e) => setOpeningNetwork(e.target.value)}
                    placeholder="0"
                    className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                  />
                </div>
              </div>
              <button
                disabled={openMutation.isPending}
                onClick={() =>
                  openMutation.mutate({
                    branchId,
                    openingCash: parseFloat(openingCash) || 0,
                    openingNetwork: parseFloat(openingNetwork) || 0,
                  })
                }
                className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
              >
                {openMutation.isPending ? "جاري الفتح..." : "فتح الخزنة"}
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">افتتحت بواسطة</p>
                  <p className="font-medium">{openSession.openedBy?.name}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">وقت الفتح</p>
                  <p className="font-medium">{formatDate(openSession.openedAt)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">المتوقع كاش</p>
                  <p className="font-bold">{formatCurrency(Number(openSession.expectedCash || 0))}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">المتوقع شبكة</p>
                  <p className="font-bold">{formatCurrency(Number(openSession.expectedNetwork || 0))}</p>
                </div>
              </div>
              {openSession.breakdown && (
                <div className="text-xs text-muted-foreground space-y-1 border border-border rounded-xl p-3">
                  <p>مبيعات كاش: {formatCurrency(openSession.breakdown.salesCash)}</p>
                  <p>مبيعات شبكة: {formatCurrency(openSession.breakdown.salesNetwork)}</p>
                  <p>مصروفات كاش: {formatCurrency(openSession.breakdown.expenseCash)}</p>
                  <p>عدد الفواتير: {openSession.breakdown.salesCount}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">الجرد الفعلي كاش *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">الجرد الفعلي شبكة</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedNetwork}
                    onChange={(e) => setCountedNetwork(e.target.value)}
                    className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                  />
                </div>
              </div>
              <input
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="ملاحظات الإغلاق (اختياري)"
                className="w-full h-10 px-3 border rounded-xl bg-background text-sm"
              />
              <button
                disabled={closeMutation.isPending || countedCash === ""}
                onClick={() => {
                  const cash = parseFloat(countedCash)
                  if (Number.isNaN(cash) || cash < 0) return toast.error("أدخل جرد الكاش")
                  closeMutation.mutate({
                    id: openSession.id,
                    data: {
                      countedCash: cash,
                      countedNetwork: parseFloat(countedNetwork) || 0,
                      notes: closeNotes || undefined,
                    },
                  })
                }}
                className="w-full h-11 bg-destructive text-destructive-foreground rounded-xl font-medium disabled:opacity-50"
              >
                {closeMutation.isPending ? "جاري الإغلاق..." : "إغلاق الخزنة واحتساب العجز"}
              </button>
            </>
          )}
        </div>

        {/* Purchase capacity */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            قدرة الشراء من السيولة
          </h2>
          <p className="text-sm text-muted-foreground">
            السيولة = كاش الخزنة + البنوك. قدرة الشراء تخصم مستحقات الموردين.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-muted/40">
              <p className="text-muted-foreground">مستحقات موردين</p>
              <p className="font-medium text-destructive">{formatCurrency(Number(liquidity?.supplierDebts || 0))}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40">
              <p className="text-muted-foreground">ديون عملاء</p>
              <p className="font-medium text-success">{formatCurrency(Number(liquidity?.customerDebts || 0))}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">مبلغ الشراء المراد</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
              placeholder="مثال: 5000"
            />
          </div>
          <button
            onClick={checkCapacity}
            className="w-full h-11 border border-border rounded-xl font-medium hover:bg-muted"
          >
            تحقق من القدرة
          </button>
          {capacityResult && (
            <div
              className={`rounded-xl p-4 border ${
                capacityResult.canAfford
                  ? "bg-success/10 border-success/30 text-success"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold mb-2">
                {capacityResult.canAfford ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {capacityResult.message}
              </div>
              <div className="text-sm space-y-1 opacity-90">
                <p>السيولة الكلية: {formatCurrency(capacityResult.totalLiquidity)}</p>
                <p>المتاح للشراء: {formatCurrency(capacityResult.availableForPurchase)}</p>
                {!capacityResult.canAfford && (
                  <p>العجز: {formatCurrency(capacityResult.shortfall)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">سجل جلسات الخزنة</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["التاريخ", "الحالة", "افتتاح كاش", "متوقع كاش", "جرد كاش", "عجز كاش", "عجز شبكة", "بواسطة"].map((h) => (
                  <th key={h} className="px-3 py-2 text-right font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">لا توجد جلسات بعد</td>
                </tr>
              ) : (
                sessions.map((s: any) => {
                  const cashDef = Number(s.cashDeficit || 0)
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(s.openedAt)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${s.status === "open" ? "bg-success/15 text-success" : "bg-muted"}`}>
                          {s.status === "open" ? "مفتوحة" : "مغلقة"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatCurrency(Number(s.openingCash || 0))}</td>
                      <td className="px-3 py-2">{formatCurrency(Number(s.expectedCash || 0))}</td>
                      <td className="px-3 py-2">{s.countedCash != null ? formatCurrency(Number(s.countedCash)) : "—"}</td>
                      <td className={`px-3 py-2 font-medium ${cashDef > 0 ? "text-destructive" : cashDef < 0 ? "text-success" : ""}`}>
                        {s.status === "closed" ? formatCurrency(cashDef) : "—"}
                      </td>
                      <td className="px-3 py-2">{s.status === "closed" ? formatCurrency(Number(s.networkDeficit || 0)) : "—"}</td>
                      <td className="px-3 py-2">{s.openedBy?.name || "—"}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
