import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, MoreVertical, Edit, Trash2, Phone, Mail, DollarSign, TrendingUp, Users, Building2, X, Loader2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { ExportMenu } from "@/components/ui/ExportMenu"
import { cn, formatCurrency } from "@/lib/utils"
import { supplierService } from "@/services/api.service"
import toast from "react-hot-toast"

interface Supplier {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  currentBalance: number
  isActive: boolean
  createdAt: string
}

const emptyForm = { name: "", phone: "", email: "", address: "", creditLimit: "", notes: "" }

export default function Suppliers() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [paySupplier, setPaySupplier] = useState<Supplier | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [form, setForm] = useState(emptyForm)

  const { data: suppliersResponse, isLoading } = useQuery({
    queryKey: ["suppliers", searchTerm, currentPage],
    queryFn: () => supplierService.getAll({
      search: searchTerm || undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ["suppliers", "statistics"],
    queryFn: () => supplierService.getStatistics(),
  })

  const suppliers: Supplier[] = suppliersResponse?.data || []
  const stats = statsResponse?.data

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? supplierService.update(editing.id, data)
      : supplierService.create(data),
    onSuccess: () => {
      toast.success(editing ? "تم تحديث المورد" : "تم إضافة المورد")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      closeDialog()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onSuccess: () => {
      toast.success("تم حذف المورد")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحذف"),
  })

  const payMutation = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      supplierService.pay(id, { amount }),
    onSuccess: () => {
      toast.success("تم تسديد الدفعة")
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      setPaySupplier(null)
      setPayAmount("")
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل التسديد"),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({
      name: s.name,
      phone: s.phone,
      email: s.email || "",
      address: s.address || "",
      creditLimit: "",
      notes: "",
    })
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSave = () => {
    if (!form.name.trim() || form.name.trim().length < 3) return toast.error("اسم المورد يجب أن يكون 3 أحرف على الأقل")
    if (!form.phone.trim() || form.phone.trim().length < 8) return toast.error("رقم الهاتف مطلوب")
    saveMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email || undefined,
      address: form.address || undefined,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الموردين" value={stats?.total ?? suppliers.length} icon={Building2} variant="primary" />
        <StatCard title="موردين نشطين" value={stats?.active ?? suppliers.filter(s => s.isActive).length} icon={Users} variant="success" />
        <StatCard title="إجمالي المستحقات" value={formatCurrency(Number(stats?.total_balance ?? stats?.totalDebt ?? 0))} icon={DollarSign} variant="warning" />
        <StatCard title="مشتريات الشهر" value={formatCurrency(Number(stats?.monthly_purchases || 0))} icon={TrendingUp} variant="info" />
      </div>

      <div className="flat-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث في الموردين..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <ExportMenu
            filename={`موردين-${new Date().toISOString().slice(0, 10)}`}
            title="الموردين"
            columns={[
              { key: "name", label: "اسم المورد" },
              { key: "phone", label: "الهاتف" },
              { key: "email", label: "البريد" },
              { key: "address", label: "العنوان" },
              { key: "currentBalance", label: "الرصيد" },
              { key: "createdAt", label: "تاريخ الإضافة" },
            ]}
            rows={suppliers.map((s) => ({
              name: s.name,
              phone: s.phone,
              email: s.email || "",
              address: s.address || "",
              currentBalance: Number(s.currentBalance || 0),
              createdAt: s.createdAt,
            }))}
            dateKey="createdAt"
          />
          <button onClick={openCreate} className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة مورد</span>
          </button>
        </div>
      </div>

      <div className="flat-card overflow-visible">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["اسم المورد", "رقم الهاتف", "البريد الإلكتروني", "العنوان", "الرصيد", "إجراءات"].map(h => (
                    <th key={h} className="text-right text-sm font-medium text-muted-foreground py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const balance = Number(supplier.currentBalance || 0)
                  return (
                    <tr key={supplier.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-4 px-4 font-medium">{supplier.name}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {supplier.phone}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {supplier.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {supplier.email}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-4 px-4 text-sm">{supplier.address || "—"}</td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          "text-sm font-semibold",
                          balance > 0 ? "text-warning" : balance < 0 ? "text-success" : "text-muted-foreground"
                        )}>
                          {formatCurrency(Math.abs(balance))}
                          {balance > 0 && " (مستحق)"}
                          {balance < 0 && " (فائض)"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <SupplierActionsMenu
                          onEdit={() => openEdit(supplier)}
                          onPay={() => { setPaySupplier(supplier); setPayAmount("") }}
                          onDelete={() => {
                            if (window.confirm(`حذف المورد "${supplier.name}"؟`)) {
                              deleteMutation.mutate(supplier.id)
                            }
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editing ? "تعديل مورد" : "إضافة مورد جديد"}</h2>
              <button onClick={closeDialog} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">الاسم *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm mb-1">الهاتف *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="01000000000" />
              </div>
              <div>
                <label className="block text-sm mb-1">البريد</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm mb-1">العنوان</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
              </button>
              <button onClick={closeDialog} className="flex-1 h-10 bg-muted rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {paySupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">تسديد دفعة — {paySupplier.name}</h2>
              <button onClick={() => setPaySupplier(null)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">الرصيد الحالي: {formatCurrency(Number(paySupplier.currentBalance || 0))}</p>
            <input type="number" min="0.01" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="المبلغ" className="w-full h-10 px-3 border border-border rounded-xl mb-4 bg-background" />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const amount = parseFloat(payAmount)
                  if (!amount || amount <= 0) return toast.error("أدخل مبلغاً صحيحاً")
                  payMutation.mutate({ id: paySupplier.id, amount })
                }}
                disabled={payMutation.isPending}
                className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl disabled:opacity-50"
              >
                تأكيد
              </button>
              <button onClick={() => setPaySupplier(null)} className="flex-1 h-10 bg-muted rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SupplierActionsMenu({ onEdit, onPay, onDelete }: { onEdit: () => void; onPay: () => void; onDelete: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuWidth = 192
      const menuHeight = 140
      let left = rect.left
      let top = rect.bottom + 4
      if (left + menuWidth > window.innerWidth) left = rect.right - menuWidth
      if (top + menuHeight > window.innerHeight) top = rect.top - menuHeight - 4
      if (left < 8) left = 8
      if (top < 8) top = 8
      setPos({ top, left })
    }
    setIsOpen(v => !v)
  }

  useEffect(() => {
    if (!isOpen) return
    const close = () => setIsOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [isOpen])

  return (
    <>
      <button ref={btnRef} onClick={openMenu} className="p-1 hover:bg-muted rounded">
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-[101] w-48 bg-card border border-border rounded-xl p-2 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <button onClick={() => { onEdit(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg">
              <Edit className="w-4 h-4" /> تعديل
            </button>
            <button onClick={() => { onPay(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg">
              <DollarSign className="w-4 h-4" /> تسديد دفعة
            </button>
            <button onClick={() => { onDelete(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" /> حذف
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
