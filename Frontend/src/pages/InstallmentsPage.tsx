import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, AlertTriangle, Clock, CheckCircle, Calendar, X, Loader2, Search } from "lucide-react"
import { ExportMenu } from "@/components/ui/ExportMenu"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface PaymentSchedule {
  id: number
  customerId?: number
  customer?: { id: number; name: string; phone: string }
  supplierId?: number
  supplier?: { id: number; name: string }
  amount: number
  paidAmount: number
  dueDate: string
  status: "pending" | "partial" | "paid" | "overdue"
  notes?: string
  paidAt?: string
}

const schedulesApi = {
  getAll: (params?: any) => api.get('/payment-schedules', { params }).then(r => r.data),
  getOverdue: () => api.get('/payment-schedules/overdue').then(r => r.data),
  create: (data: any) => api.post('/payment-schedules', data).then(r => r.data),
  pay: (id: number, paidAmount?: number) => api.put(`/payment-schedules/${id}/pay`, { paidAmount }).then(r => r.data),
}
const customersApi = { getAll: () => api.get('/customers', { params: { limit: 200 } }).then(r => r.data) }
const suppliersApi = { getAll: () => api.get('/suppliers', { params: { limit: 200 } }).then(r => r.data) }

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: "قيد الانتظار", cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  partial: { label: "مدفوع جزئياً", cls: "bg-blue-100 text-blue-700", icon: Clock },
  paid: { label: "مدفوع", cls: "bg-green-100 text-green-700", icon: CheckCircle },
  overdue: { label: "متأخر", cls: "bg-red-100 text-red-700", icon: AlertTriangle },
}

export default function InstallmentsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "customer" | "supplier">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [payAmount, setPayAmount] = useState("")

  const { data: res, isLoading } = useQuery({
    queryKey: ["schedules", statusFilter, typeFilter, page, searchTerm],
    queryFn: () => schedulesApi.getAll({
      status: statusFilter || undefined,
      page,
      limit: 20,
      search: searchTerm || undefined,
      overdue: statusFilter === "overdue" ? "true" : undefined,
    }),
  })

  const { data: overdueRes } = useQuery({ queryKey: ["schedules-overdue"], queryFn: schedulesApi.getOverdue })
  const { data: customersRes } = useQuery({ queryKey: ["customers-list"], queryFn: customersApi.getAll })
  const { data: suppliersRes } = useQuery({ queryKey: ["suppliers-list"], queryFn: suppliersApi.getAll })

  const createMutation = useMutation({
    mutationFn: schedulesApi.create,
    onSuccess: () => { toast.success("تم إضافة القسط"); queryClient.invalidateQueries({ queryKey: ["schedules"] }); setShowCreate(false) },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ"),
  })

  const payMutation = useMutation({
    mutationFn: ({ id, amount }: any) => schedulesApi.pay(id, amount),
    onSuccess: () => { toast.success("تم تسجيل الدفعة"); queryClient.invalidateQueries({ queryKey: ["schedules"] }); setPayingId(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ"),
  })

  const schedules: PaymentSchedule[] = res?.data || []
  const pagination = res?.pagination
  const overdueCount = overdueRes?.count || 0
  const customers: any[] = customersRes?.data || []
  const suppliers: any[] = suppliersRes?.data || []

  const isOverdue = (s: PaymentSchedule) => new Date(s.dueDate) < new Date() && s.status !== "paid"

  return (
    <div className="space-y-6">
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700 font-medium">تنبيه: يوجد <strong>{overdueCount}</strong> قسط متأخر الدفع!</span>
          <button onClick={() => setStatusFilter("overdue")} className="mr-auto text-xs text-red-600 underline">عرضها</button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">متابعة الأقساط والديون</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع جدول المدفوعات والأقساط المستحقة</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename={`أقساط-${new Date().toISOString().slice(0, 10)}`}
            title="الأقساط والديون"
            columns={[
              { key: "party", label: "العميل/المورد" },
              { key: "dueDate", label: "تاريخ الاستحقاق" },
              { key: "amount", label: "المبلغ الكلي" },
              { key: "paidAmount", label: "المدفوع" },
              { key: "remaining", label: "المتبقي" },
              { key: "status", label: "الحالة" },
            ]}
            rows={schedules.map((s: PaymentSchedule) => ({
              party: s.customer?.name || s.supplier?.name || "",
              dueDate: s.dueDate,
              amount: Number(s.amount || 0),
              paidAmount: Number(s.paidAmount || 0),
              remaining: Number(s.amount || 0) - Number(s.paidAmount || 0),
              status: statusConfig[s.status]?.label || s.status,
            }))}
            dateKey="dueDate"
          />
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium">
            <Plus className="w-4 h-4" /> إضافة قسط
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries({ "": "الكل", pending: "قيد الانتظار", partial: "جزئي", paid: "مدفوع", overdue: "متأخر" }).map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)} className={cn("px-4 py-2 rounded-xl text-sm border transition-colors", statusFilter === v ? "bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>{l}</button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="البحث باسم العميل أو المورد..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
          className="w-full h-12 pr-12 pl-4 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          : schedules.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد أقساط</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["العميل/المورد", "تاريخ الاستحقاق", "المبلغ الكلي", "المدفوع", "المتبقي", "الحالة", "إجراءات"].map(h => <th key={h} className="px-4 py-3 text-right font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {schedules.map(s => {
                    const cfg = isOverdue(s) && s.status !== "paid" ? statusConfig.overdue : statusConfig[s.status] || statusConfig.pending
                    const remaining = Number(s.amount) - Number(s.paidAmount)
                    return (
                      <tr key={s.id} className={cn("border-t border-border hover:bg-muted/20 transition-colors", isOverdue(s) && s.status !== "paid" && "bg-red-50/50")}>
                        <td className="px-4 py-3">{s.customer?.name || s.supplier?.name || "—"}</td>
                        <td className={cn("px-4 py-3", isOverdue(s) && s.status !== "paid" ? "text-red-600 font-semibold" : "text-muted-foreground")}>{formatDate(s.dueDate)}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(Number(s.amount))}</td>
                        <td className="px-4 py-3 text-green-600">{formatCurrency(Number(s.paidAmount))}</td>
                        <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(remaining)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", cfg.cls)}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {s.status !== "paid" && (
                            payingId === s.id ? (
                              <div className="flex items-center gap-2">
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={formatCurrency(remaining)} className="w-24 px-2 py-1 border border-border rounded-lg text-sm bg-background" />
                                <button onClick={() => payMutation.mutate({ id: s.id, amount: payAmount ? parseFloat(payAmount) : undefined })} disabled={payMutation.isPending} className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs">
                                  {payMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
                                </button>
                                <button onClick={() => setPayingId(null)} className="px-2 py-1 border border-border rounded-lg text-xs">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => { setPayingId(s.id); setPayAmount("") }} className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs hover:bg-primary/90">تسجيل دفعة</button>
                            )
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">السابق</button>
            <span className="px-3 py-1 text-sm">{page} / {pagination.totalPages}</span>
            <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">التالي</button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">إضافة قسط جديد</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <CreateScheduleForm customers={customers} suppliers={suppliers} onSubmit={createMutation.mutate} submitting={createMutation.isPending} onClose={() => setShowCreate(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function CreateScheduleForm({ customers, suppliers, onSubmit, submitting, onClose }: any) {
  const [form, setForm] = useState({ partyType: "customer", customerId: "", supplierId: "", amount: "", dueDate: "", notes: "" })

  const handleSubmit = () => {
    if (!form.amount || !form.dueDate) return toast.error("المبلغ وتاريخ الاستحقاق مطلوبان")
    onSubmit({
      customerId: form.partyType === "customer" && form.customerId ? parseInt(form.customerId) : undefined,
      supplierId: form.partyType === "supplier" && form.supplierId ? parseInt(form.supplierId) : undefined,
      amount: parseFloat(form.amount),
      dueDate: form.dueDate,
      notes: form.notes,
    })
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">نوع الطرف</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setForm({ ...form, partyType: "customer" })} className={cn("py-2 rounded-xl border text-sm transition-colors", form.partyType === "customer" ? "bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>عميل</button>
          <button onClick={() => setForm({ ...form, partyType: "supplier" })} className={cn("py-2 rounded-xl border text-sm transition-colors", form.partyType === "supplier" ? "bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>مورد</button>
        </div>
      </div>

      {form.partyType === "customer" ? (
        <div>
          <label className="block text-sm font-medium mb-1.5">العميل</label>
          <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
            <option value="">اختر العميل</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-1.5">المورد</label>
          <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
            <option value="">اختر المورد</option>
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">المبلغ <span className="text-destructive">*</span></label>
          <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">تاريخ الاستحقاق <span className="text-destructive">*</span></label>
          <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
        <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">إلغاء</button>
        <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
        </button>
      </div>
    </div>
  )
}
