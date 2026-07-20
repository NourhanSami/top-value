import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, MoreVertical, Edit, Trash2, Building2, TrendingUp, Users, MapPin, Phone, X, Loader2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { ExportMenu } from "@/components/ui/ExportMenu"
import { cn, formatCurrency } from "@/lib/utils"
import { branchService } from "@/services/api.service"
import toast from "react-hot-toast"

interface Branch {
  id: number
  name: string
  code: string
  address?: string
  phone?: string
  city?: string
  email?: string
  isActive: boolean
  isMain: boolean
  _count?: { users: number; sales: number }
  statistics?: { totalSales: number }
  createdAt: string
}

const emptyForm = { name: "", code: "", phone: "", email: "", address: "", city: "", isActive: true }

export default function Branches() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: branchesResponse, isLoading } = useQuery({
    queryKey: ["branches", searchTerm],
    queryFn: () => branchService.getAll({ search: searchTerm || undefined }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ["branches", "statistics"],
    queryFn: () => branchService.getStatistics(),
  })

  const branches: Branch[] = branchesResponse?.data || []
  const stats = statsResponse?.data

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? branchService.update(editing.id, data)
      : branchService.create(data),
    onSuccess: () => {
      toast.success(editing ? "تم تحديث الفرع" : "تم إضافة الفرع")
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      closeDialog()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "حدث خطأ"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchService.delete(id),
    onSuccess: () => {
      toast.success("تم حذف الفرع")
      queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحذف"),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowDialog(true)
  }

  const openEdit = (branch: Branch) => {
    setEditing(branch)
    setForm({
      name: branch.name,
      code: branch.code,
      phone: branch.phone || "",
      email: branch.email || "",
      address: branch.address || "",
      city: branch.city || "",
      isActive: branch.isActive,
    })
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSave = () => {
    if (!form.name.trim() || form.name.trim().length < 3) return toast.error("اسم الفرع يجب أن يكون 3 أحرف على الأقل")
    if (!form.code.trim() || form.code.trim().length < 2) return toast.error("كود الفرع مطلوب")
    saveMutation.mutate({
      name: form.name.trim(),
      code: form.code.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      isActive: form.isActive,
    })
  }

  const totalSales = Number(stats?.total_sales || branches.reduce((s, b) => s + Number(b.statistics?.totalSales || 0), 0))
  const totalEmployees = Number(stats?.total_employees || branches.reduce((s, b) => s + Number(b._count?.users || 0), 0))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الفروع" value={stats?.total ?? branches.length} icon={Building2} variant="primary" />
        <StatCard title="فروع نشطة" value={stats?.active ?? branches.filter(b => b.isActive).length} icon={Building2} variant="success" />
        <StatCard title="إجمالي المبيعات" value={formatCurrency(totalSales)} icon={TrendingUp} variant="info" />
        <StatCard title="عدد الموظفين" value={totalEmployees} icon={Users} variant="warning" />
      </div>

      <div className="flat-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث في الفروع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <ExportMenu
            filename={`فروع-${new Date().toISOString().slice(0, 10)}`}
            title="الفروع"
            columns={[
              { key: "name", label: "اسم الفرع" },
              { key: "code", label: "الكود" },
              { key: "phone", label: "الهاتف" },
              { key: "address", label: "العنوان" },
              { key: "isActive", label: "الحالة" },
              { key: "isMain", label: "رئيسي" },
              { key: "users", label: "الموظفون" },
              { key: "sales", label: "عدد المبيعات" },
              { key: "createdAt", label: "تاريخ الإضافة" },
            ]}
            rows={branches.map((b) => ({
              name: b.name,
              code: b.code || "",
              phone: b.phone || "",
              address: b.address || "",
              isActive: b.isActive ? "نشط" : "غير نشط",
              isMain: b.isMain ? "نعم" : "لا",
              users: Number(b._count?.users || 0),
              sales: Number(b._count?.sales || 0),
              createdAt: b.createdAt,
            }))}
            dateKey="createdAt"
          />
          <button onClick={openCreate} className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة فرع</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={() => openEdit(branch)}
              onDelete={() => {
                if (window.confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟`)) {
                  deleteMutation.mutate(branch.id)
                }
              }}
            />
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editing ? "تعديل الفرع" : "إضافة فرع جديد"}</h2>
              <button onClick={closeDialog} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">اسم الفرع *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm mb-1">الكود *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-sm mb-1">الهاتف</label>
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
              <div>
                <label className="block text-sm mb-1">المدينة</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
                فرع نشط
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ
              </button>
              <button onClick={closeDialog} className="flex-1 h-10 bg-muted rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BranchCard({ branch, onEdit, onDelete }: { branch: Branch; onEdit: () => void; onDelete: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const { data: performanceResponse } = useQuery({
    queryKey: ["branches", branch.id, "performance"],
    queryFn: () => branchService.getPerformance(branch.id),
    enabled: showDetails,
  })
  const performance = performanceResponse?.data

  return (
    <div className="flat-card hover-lift p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{branch.name}</h3>
            <p className="text-sm text-muted-foreground">كود: {branch.code}</p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 hover:bg-muted rounded">
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-48 flat-card p-2 z-20 shadow-flat-lg">
                <button onClick={() => { onEdit(); setIsMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg">
                  <Edit className="w-4 h-4" /> تعديل
                </button>
                {!branch.isMain && (
                  <button onClick={() => { onDelete(); setIsMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="w-4 h-4" /> حذف
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {branch.address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" /><span>{branch.address}</span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" /><span>{branch.phone}</span>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <span className={cn("inline-flex px-2 py-1 rounded-md text-xs font-medium", branch.isActive ? "bg-success-light text-success" : "bg-destructive/10 text-destructive")}>
          {branch.isActive ? "نشط" : "غير نشط"}
        </span>
        {branch.isMain && (
          <span className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">رئيسي</span>
        )}
      </div>

      {!showDetails ? (
        <button onClick={() => setShowDetails(true)} className="w-full py-2 text-sm text-primary hover:text-primary/80">عرض التفاصيل ←</button>
      ) : (
        <div className="pt-4 border-t border-border space-y-3">
          {performance ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الإيرادات</span>
                <span className="font-semibold text-primary">{formatCurrency(performance.revenue || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">عدد المبيعات</span>
                <span className="font-semibold">{performance.totalSales || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الموظفون</span>
                <span className="font-semibold">{branch._count?.users || 0}</span>
              </div>
              <button onClick={() => setShowDetails(false)} className="w-full py-2 text-sm text-muted-foreground">إخفاء التفاصيل ↑</button>
            </>
          ) : (
            <div className="flex justify-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
