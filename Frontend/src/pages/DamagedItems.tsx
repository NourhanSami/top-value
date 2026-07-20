import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  X,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface DamagedItem {
  id: number
  product_id: number
  product: {
    id: number
    name: string
    price: number
  }
  branch_id: number
  branch: {
    id: number
    name: string
  }
  quantity: number
  loss_amount: number
  reason: string
  damage_type: "expired" | "damaged" | "lost" | "other"
  status: "pending" | "approved" | "rejected"
  reported_by: number
  reporter?: {
    id: number
    name: string
  }
  created_at: string
  updated_at: string
}

type StatusFilter = "all" | "pending" | "approved" | "rejected"
type DamageTypeFilter = "all" | "expired" | "damaged" | "lost" | "other"

export default function DamagedItems() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [damageTypeFilter, setDamageTypeFilter] = useState<DamageTypeFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [viewItem, setViewItem] = useState<any>(null)

  const { data: itemsResponse, isLoading } = useQuery({
    queryKey: ["damaged-items", searchTerm, statusFilter, damageTypeFilter, currentPage],
    queryFn: () => api.get('/damaged-items', {
      params: {
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        damageType: damageTypeFilter !== "all" ? damageTypeFilter : undefined,
        page: currentPage,
        limit: 20,
      }
    }).then(r => r.data),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ["damaged-items", "statistics"],
    queryFn: () => api.get('/damaged-items/statistics').then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/damaged-items', data).then(r => r.data),
    onSuccess: () => { toast.success("تم تسجيل الهالك وخصمه من المخزون"); queryClient.invalidateQueries({ queryKey: ["damaged-items"] }); queryClient.invalidateQueries({ queryKey: ["products"] }); setShowAddDialog(false) },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ"),
  })

  const items = itemsResponse?.data || []
  const pagination = itemsResponse?.pagination
  const stats = statsResponse?.data || { total: 0, pending: 0, approved: 0, total_loss: 0 }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return {
          label: "معتمد",
          icon: CheckCircle,
          className: "bg-success-light text-success",
        }
      case "rejected":
        return {
          label: "مرفوض",
          icon: XCircle,
          className: "bg-destructive/10 text-destructive",
        }
      case "pending":
      default:
        return {
          label: "معلق",
          icon: Clock,
          className: "bg-warning-light text-warning",
        }
    }
  }

  const getDamageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      expired: "منتهي الصلاحية",
      damaged: "تالف",
      lost: "مفقود",
      other: "أخرى",
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الهوالك"
          value={stats.total}
          icon={AlertTriangle}
          variant="primary"
        />
        <StatCard
          title="معلق"
          value={stats.pending}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="معتمد"
          value={stats.approved}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="إجمالي الخسارة"
          value={formatCurrency(stats.total_loss)}
          icon={DollarSign}
          variant="destructive"
        />
      </div>

      {/* Toolbar */}
      <div className="flat-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث في الهوالك..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Damage Type Filter */}
          <select
            value={damageTypeFilter}
            onChange={(e) => setDamageTypeFilter(e.target.value as DamageTypeFilter)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع الأنواع</option>
            <option value="expired">منتهي الصلاحية</option>
            <option value="damaged">تالف</option>
            <option value="lost">مفقود</option>
            <option value="other">أخرى</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">معلق</option>
            <option value="approved">معتمد</option>
            <option value="rejected">مرفوض</option>
          </select>

          {/* Add Button */}
          <button 
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">تسجيل هالك</span>
          </button>
        </div>
      </div>

      {/* Damaged Items Table */}
      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-foreground font-semibold mb-2">لا توجد هوالك مسجلة</p>
            <p className="text-sm text-muted-foreground">ابدأ بتسجيل أول هالك</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المنتج
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الفرع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الكمية
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الخسارة
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    النوع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الحالة
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    السبب
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المُبلّغ
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    التاريخ
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const status = getStatusBadge(item.status)
                  const StatusIcon = status.icon
                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium">{item.product?.name || "—"}</td>
                      <td className="py-4 px-4 text-sm">{item.branch?.name || "—"}</td>
                      <td className="py-4 px-4 text-sm">{item.quantity}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-destructive">{formatCurrency(Number(item.lossAmount || 0))}</td>
                      <td className="py-4 px-4 text-sm">{getDamageTypeLabel(item.damageType)}</td>
                      <td className="py-4 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", status.className)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm max-w-[160px] truncate">{item.reason}</td>
                      <td className="py-4 px-4 text-sm">{item.user?.name || "—"}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{formatDate(item.damagedAt || item.createdAt)}</td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setViewItem(item)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Damaged Item Dialog */}
      {showAddDialog && (
        <AddDamagedItemDialog onClose={() => setShowAddDialog(false)} onSubmit={data => addMutation.mutate(data)} submitting={addMutation.isPending} />
      )}

      {viewItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">تفاصيل الهالك</h2>
              <button onClick={() => setViewItem(null)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">المنتج</span><strong>{viewItem.product?.name}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الفرع</span><strong>{viewItem.branch?.name}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الكمية</span><strong>{viewItem.quantity}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">قيمة الخسارة</span><strong className="text-destructive">{formatCurrency(Number(viewItem.lossAmount || 0))}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><strong>{getDamageTypeLabel(viewItem.damageType)}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الحالة</span><strong>{getStatusBadge(viewItem.status).label}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">المُبلّغ</span><strong>{viewItem.user?.name || "—"}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">التاريخ</span><strong>{formatDate(viewItem.damagedAt || viewItem.createdAt)}</strong></div>
              <div><span className="text-muted-foreground">السبب:</span><p className="mt-1 font-medium">{viewItem.reason}</p></div>
              {viewItem.notes && <div><span className="text-muted-foreground">ملاحظات:</span><p className="mt-1">{viewItem.notes}</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface AddDamagedItemDialogProps {
  onClose: () => void
  onSubmit: (data: any) => void
  submitting: boolean
}

function AddDamagedItemDialog({ onClose, onSubmit, submitting }: AddDamagedItemDialogProps) {
  const [productSearch, setProductSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [productResults, setProductResults] = useState<any[]>([])
  const [quantity, setQuantity] = useState("")
  const [lossAmount, setLossAmount] = useState("")
  const [damageType, setDamageType] = useState<"expired" | "damaged" | "lost" | "other">("damaged")
  const [reason, setReason] = useState("")

  const searchProduct = async (q: string) => {
    setProductSearch(q)
    if (q.length < 2) { setProductResults([]); return }
    const res = await api.get('/products', { params: { search: q, limit: 6 } })
    setProductResults(res.data.data || [])
  }

  const selectProduct = (p: any) => {
    setSelectedProduct(p)
    setProductSearch(p.name)
    setProductResults([])
    setLossAmount(String(Number(p.costPrice || p.sellingPrice || 0)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return toast.error("يرجى اختيار منتج")
    if (!quantity || parseInt(quantity) <= 0) return toast.error("يرجى إدخال كمية صحيحة")
    onSubmit({ productId: selectedProduct.id, branchId: 1, quantity: parseInt(quantity), lossAmount: parseFloat(lossAmount) || 0, reason, damageType })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">تسجيل هالك جديد</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Search */}
          <div>
            <label className="block text-sm font-medium mb-2">المنتج <span className="text-destructive">*</span></label>
            <div className="relative">
              <input type="text" value={productSearch} onChange={e => searchProduct(e.target.value)} placeholder="ابحث عن المنتج بالاسم أو الباركود" className="w-full h-10 px-4 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {productResults.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10">
                  {productResults.map(p => (
                    <button key={p.id} type="button" onClick={() => selectProduct(p)} className="w-full text-right px-4 py-2 text-sm hover:bg-muted flex justify-between">
                      <span>{p.name}</span><span className="text-muted-foreground text-xs">مخزون: {p.stockQuantity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedProduct && <p className="text-xs text-green-600 mt-1">✓ {selectedProduct.name} — المخزون الحالي: {selectedProduct.stockQuantity}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">الكمية <span className="text-destructive">*</span></label>
              <input type="number" min="1" max={selectedProduct?.stockQuantity} value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full h-10 px-4 border border-border rounded-xl text-sm bg-background focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">قيمة الخسارة</label>
              <input type="number" min="0" step="0.01" value={lossAmount} onChange={e => setLossAmount(e.target.value)} className="w-full h-10 px-4 border border-border rounded-xl text-sm bg-background focus:outline-none" />
            </div>
          </div>

          {/* Damage Type */}
          <div>
            <label className="block text-sm font-medium mb-2">نوع الهالك <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "expired" as const, label: "منتهي الصلاحية", icon: AlertTriangle },
                { value: "damaged" as const, label: "تالف", icon: Package },
                { value: "lost" as const, label: "مفقود", icon: XCircle },
                { value: "other" as const, label: "أخرى", icon: MoreVertical },
              ].map(type => (
                <button key={type.value} type="button" onClick={() => setDamageType(type.value)} className={cn("p-4 rounded-xl border-2 transition-all flex items-center gap-3", damageType === type.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <type.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">السبب <span className="text-destructive">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="اشرح سبب الهالك..." className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none resize-none" required />
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700">سيتم خصم الكمية فوراً من المخزون بعد التسجيل.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 h-12 border border-border rounded-xl font-medium hover:bg-muted transition-colors">إلغاء</button>
            <button type="submit" disabled={submitting} className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              تسجيل الهالك
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
