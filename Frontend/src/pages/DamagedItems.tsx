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
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

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

  // Mock data - replace with actual API call
  const { data: itemsResponse, isLoading } = useQuery({
    queryKey: ["damaged-items", searchTerm, statusFilter, damageTypeFilter, currentPage],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return { data: [], total: 0 }
    },
  })

  const items = itemsResponse?.data || []

  // Mock statistics
  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    total_loss: 0,
  }

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
                <tr className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>قريباً - سيتم عرض الهوالك هنا</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Damaged Item Dialog */}
      {showAddDialog && (
        <AddDamagedItemDialog onClose={() => setShowAddDialog(false)} />
      )}
    </div>
  )
}

interface AddDamagedItemDialogProps {
  onClose: () => void
}

function AddDamagedItemDialog({ onClose }: AddDamagedItemDialogProps) {
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [damageType, setDamageType] = useState<"expired" | "damaged" | "lost" | "other">("damaged")
  const [reason, setReason] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement damaged item creation
    alert("سيتم تسجيل الهالك قريباً")
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl flat-card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-foreground mb-6">تسجيل هالك جديد</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              المنتج *
            </label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="ابحث عن المنتج أو امسح الباركود"
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الكمية *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="أدخل الكمية"
              min="1"
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Damage Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              نوع الهالك *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "expired" as const, label: "منتهي الصلاحية", icon: AlertTriangle },
                { value: "damaged" as const, label: "تالف", icon: Package },
                { value: "lost" as const, label: "مفقود", icon: XCircle },
                { value: "other" as const, label: "أخرى", icon: MoreVertical },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setDamageType(type.value)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                    damageType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <type.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              السبب التفصيلي *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اشرح سبب الهالك بالتفصيل..."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              required
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-warning-light rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning mb-1">تنبيه مهم</p>
              <p className="text-xs text-warning">
                سيتم خصم الكمية المُبلّغ عنها من المخزون بعد الموافقة. تأكد من دقة البيانات المدخلة.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              تسجيل الهالك
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
