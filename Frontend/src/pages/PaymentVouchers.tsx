import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, X, Loader2, Banknote, CreditCard, Building } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface PaymentVoucher {
  id: number
  voucherNumber: string
  voucherType: "receipt" | "payment"
  customer?: { id: number; name: string }
  supplier?: { id: number; name: string }
  branch: { id: number; name: string }
  user: { id: number; name: string }
  bankAccount?: { id: number; name: string; bankName: string }
  amount: number
  paymentMethod: string
  voucherDate: string
  notes?: string
}

const vouchersApi = {
  getAll: (params?: any) => api.get('/vouchers', { params }).then(r => r.data),
  getStats: () => api.get('/vouchers/statistics').then(r => r.data),
  create: (data: any) => api.post('/vouchers', data).then(r => r.data),
}

const customersApi = { getAll: () => api.get('/customers', { params: { limit: 200 } }).then(r => r.data) }
const suppliersApi = { getAll: () => api.get('/suppliers', { params: { limit: 200 } }).then(r => r.data) }
const bankApi = { getAll: () => api.get('/bank-accounts').then(r => r.data) }

const paymentMethodLabel: Record<string, string> = { cash: "نقدي", bank: "بنكي", card: "بطاقة", transfer: "حوالة" }

export default function PaymentVouchers() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(1)

  const { data: res, isLoading } = useQuery({ queryKey: ["vouchers", typeFilter, page], queryFn: () => vouchersApi.getAll({ voucherType: typeFilter || undefined, page, limit: 20 }) })
  const { data: statsRes } = useQuery({ queryKey: ["vouchers-stats"], queryFn: vouchersApi.getStats })
  const { data: customersRes } = useQuery({ queryKey: ["customers-list"], queryFn: customersApi.getAll })
  const { data: suppliersRes } = useQuery({ queryKey: ["suppliers-list"], queryFn: suppliersApi.getAll })
  const { data: banksRes } = useQuery({ queryKey: ["bank-accounts"], queryFn: bankApi.getAll })

  const createMutation = useMutation({
    mutationFn: vouchersApi.create,
    onSuccess: () => { toast.success("تم إنشاء السند بنجاح"); queryClient.invalidateQueries({ queryKey: ["vouchers"] }); setShowCreate(false) },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ"),
  })

  const vouchers: PaymentVoucher[] = res?.data || []
  const pagination = res?.pagination
  const stats = statsRes?.data
  const customers: any[] = customersRes?.data || []
  const suppliers: any[] = suppliersRes?.data || []
  const banks: any[] = banksRes?.data || []

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl"><ArrowDownCircle className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي سندات القبض</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(Number(stats?.total_receipts || 0))}</p>
              <p className="text-xs text-muted-foreground">{stats?.total_receipts_count || 0} سند</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl"><ArrowUpCircle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي سندات الدفع</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(Number(stats?.total_payments || 0))}</p>
              <p className="text-xs text-muted-foreground">{stats?.total_payments_count || 0} سند</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">سندات القبض والدفع</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع المدفوعات الواردة والصادرة</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium">
          <Plus className="w-4 h-4" /> سند جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <button onClick={() => setTypeFilter("")} className={cn("px-4 py-2 rounded-xl text-sm border transition-colors", !typeFilter ? "bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>الكل</button>
        <button onClick={() => setTypeFilter("receipt")} className={cn("px-4 py-2 rounded-xl text-sm border transition-colors flex items-center gap-2", typeFilter === "receipt" ? "bg-green-600 text-white border-green-600" : "border-border hover:bg-muted")}>
          <ArrowDownCircle className="w-4 h-4" /> سندات القبض
        </button>
        <button onClick={() => setTypeFilter("payment")} className={cn("px-4 py-2 rounded-xl text-sm border transition-colors flex items-center gap-2", typeFilter === "payment" ? "bg-red-600 text-white border-red-600" : "border-border hover:bg-muted")}>
          <ArrowUpCircle className="w-4 h-4" /> سندات الدفع
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          : vouchers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد سندات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["رقم السند", "النوع", "العميل/المورد", "طريقة الدفع", "البنك", "التاريخ", "المبلغ"].map(h => <th key={h} className="px-4 py-3 text-right font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-primary">{v.voucherNumber}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1 w-fit", v.voucherType === "receipt" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {v.voucherType === "receipt" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                          {v.voucherType === "receipt" ? "قبض" : "دفع"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{v.customer?.name || v.supplier?.name || "—"}</td>
                      <td className="px-4 py-3">{paymentMethodLabel[v.paymentMethod] || v.paymentMethod}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.bankAccount ? `${v.bankAccount.bankName} - ${v.bankAccount.name}` : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(v.voucherDate)}</td>
                      <td className={cn("px-4 py-3 font-bold", v.voucherType === "receipt" ? "text-green-600" : "text-red-600")}>{formatCurrency(Number(v.amount))}</td>
                    </tr>
                  ))}
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

      {/* Create Dialog */}
      {showCreate && <CreateVoucherDialog customers={customers} suppliers={suppliers} banks={banks} onClose={() => setShowCreate(false)} onSubmit={data => createMutation.mutate(data)} submitting={createMutation.isPending} />}
    </div>
  )
}

function CreateVoucherDialog({ customers, suppliers, banks, onClose, onSubmit, submitting }: any) {
  const [form, setForm] = useState({ voucherType: "receipt", customerId: "", supplierId: "", branchId: 1, bankAccountId: "", amount: "", paymentMethod: "cash", voucherDate: new Date().toISOString().split('T')[0], notes: "" })

  const handleSubmit = () => {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("أدخل المبلغ")
    onSubmit({ ...form, customerId: form.customerId ? parseInt(form.customerId) : undefined, supplierId: form.supplierId ? parseInt(form.supplierId) : undefined, bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId) : undefined, amount: parseFloat(form.amount) })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">سند جديد</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">نوع السند</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setForm({ ...form, voucherType: "receipt" })} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors", form.voucherType === "receipt" ? "bg-green-600 text-white border-green-600" : "border-border hover:bg-muted")}>
                <ArrowDownCircle className="w-4 h-4" /> سند قبض (استلام)
              </button>
              <button onClick={() => setForm({ ...form, voucherType: "payment" })} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors", form.voucherType === "payment" ? "bg-red-600 text-white border-red-600" : "border-border hover:bg-muted")}>
                <ArrowUpCircle className="w-4 h-4" /> سند دفع (صرف)
              </button>
            </div>
          </div>

          {form.voucherType === "receipt" ? (
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
              <label className="block text-sm font-medium mb-1.5">التاريخ</label>
              <input type="date" value={form.voucherDate} onChange={e => setForm({ ...form, voucherDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">طريقة الدفع</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
                <option value="cash">نقدي</option>
                <option value="bank">بنكي</option>
                <option value="card">بطاقة</option>
                <option value="transfer">حوالة</option>
              </select>
            </div>
            {banks.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">الحساب البنكي</label>
                <select value={form.bankAccountId} onChange={e => setForm({ ...form, bankAccountId: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
                  <option value="">اختر الحساب</option>
                  {banks.map((b: any) => <option key={b.id} value={b.id}>{b.bankName} - {b.name}</option>)}
                </select>
              </div>
            )}
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
      </div>
    </div>
  )
}
