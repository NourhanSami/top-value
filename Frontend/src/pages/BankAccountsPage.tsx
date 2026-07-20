import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Building, Pencil, Trash2, Loader2, X, Landmark, Search } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface BankAccount {
  id: number
  name: string
  bankName: string
  accountNumber: string
  iban?: string
  balance: number
  currency: string
  isActive: boolean
  notes?: string
}

const bankApi = {
  getAll: (params?: any) => api.get('/bank-accounts', { params }).then(r => r.data),
  create: (data: any) => api.post('/bank-accounts', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/bank-accounts/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/bank-accounts/${id}`).then(r => r.data),
}

const defaultForm = { name: "", bankName: "", accountNumber: "", iban: "", balance: "0", currency: "EGP", notes: "" }

export default function BankAccountsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [searchTerm, setSearchTerm] = useState("")

  const { data: res, isLoading } = useQuery({
    queryKey: ["bank-accounts", searchTerm],
    queryFn: () => bankApi.getAll({ search: searchTerm || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: bankApi.create,
    onSuccess: () => { toast.success("تم إضافة الحساب البنكي"); queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }); closeForm() },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ"),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => bankApi.update(id, data),
    onSuccess: () => { toast.success("تم تحديث الحساب البنكي"); queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }); closeForm() },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ"),
  })
  const deleteMutation = useMutation({
    mutationFn: bankApi.delete,
    onSuccess: () => { toast.success("تم حذف الحساب"); queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }) },
  })

  const closeForm = () => { setShowForm(false); setEditingAccount(null); setForm(defaultForm) }
  const openEdit = (account: BankAccount) => { setEditingAccount(account); setForm({ name: account.name, bankName: account.bankName, accountNumber: account.accountNumber, iban: account.iban || "", balance: String(account.balance), currency: account.currency, notes: account.notes || "" }); setShowForm(true) }

  const handleSubmit = () => {
    if (!form.name || !form.bankName || !form.accountNumber) return toast.error("اسم الحساب، اسم البنك، ورقم الحساب مطلوبة")
    const data = { ...form, balance: parseFloat(form.balance) || 0 }
    if (editingAccount) updateMutation.mutate({ id: editingAccount.id, ...data })
    else createMutation.mutate(data)
  }

  const accounts: BankAccount[] = res?.data || []
  const totalBalance = res?.total_balance || 0
  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحسابات البنكية</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة الحسابات البنكية للمنشأة</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium">
          <Plus className="w-4 h-4" /> إضافة حساب
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="البحث باسم الحساب أو البنك أو رقم الحساب..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 pr-12 pl-4 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Total Balance */}
      {accounts.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">إجمالي الأرصدة البنكية</p>
          <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(totalBalance)}</p>
        </div>
      )}

      {isLoading ? <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        : accounts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
            <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد حسابات بنكية مضافة</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-primary text-sm hover:underline">+ إضافة حساب جديد</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(account => (
              <div key={account.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl"><Building className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.bankName}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(account)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => deleteMutation.mutate(account.id)} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">رقم الحساب:</span><span className="font-mono">{account.accountNumber}</span></div>
                  {account.iban && <div className="flex justify-between"><span className="text-muted-foreground">IBAN:</span><span className="font-mono text-xs">{account.iban}</span></div>}
                  <div className="flex justify-between items-center pt-2 border-t border-border"><span className="text-muted-foreground">الرصيد:</span><span className="font-bold text-lg text-primary">{formatCurrency(Number(account.balance))} <span className="text-xs text-muted-foreground">{account.currency}</span></span></div>
                </div>
              </div>
            ))}
          </div>
        )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">{editingAccount ? "تعديل الحساب البنكي" : "إضافة حساب بنكي جديد"}</h2>
              <button onClick={closeForm} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">اسم الحساب <span className="text-destructive">*</span></label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" placeholder="مثال: الحساب الرئيسي" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">اسم البنك <span className="text-destructive">*</span></label>
                <input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" placeholder="مثال: البنك الأهلي" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">رقم الحساب <span className="text-destructive">*</span></label>
                <input value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">IBAN (اختياري)</label>
                <input value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">الرصيد الابتدائي</label>
                  <input type="number" min="0" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">العملة</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
                    <option value="EGP">EGP - جنيه مصري</option>
                    <option value="SAR">SAR - ريال سعودي</option>
                    <option value="AED">AED - درهم إماراتي</option>
                    <option value="USD">USD - دولار أمريكي</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeForm} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">إلغاء</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
