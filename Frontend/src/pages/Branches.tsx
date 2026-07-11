import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  TrendingUp,
  Users,
  Package,
  MapPin,
  Phone,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency } from "@/lib/utils"
import { branchService } from "@/services/api.service"

interface Branch {
  id: number
  name: string
  code: string
  address?: string
  phone?: string
  manager_id?: number
  manager?: {
    id: number
    name: string
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function Branches() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch branches
  const { data: branchesResponse, isLoading } = useQuery({
    queryKey: ["branches", searchTerm],
    queryFn: () => branchService.getAll({
      search: searchTerm || undefined,
    }),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["branches", "statistics"],
    queryFn: () => branchService.getStatistics(),
  })

  const branches = branchesResponse?.data || []
  const stats = statsResponse?.data

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
  })

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الفروع"
          value={stats?.total || branches.length}
          icon={Building2}
          variant="primary"
        />
        <StatCard
          title="فروع نشطة"
          value={stats?.active || branches.filter((b: Branch) => b.is_active).length}
          icon={Building2}
          variant="success"
        />
        <StatCard
          title="إجمالي المبيعات"
          value={formatCurrency(stats?.total_sales || 0)}
          icon={TrendingUp}
          variant="info"
        />
        <StatCard
          title="عدد الموظفين"
          value={stats?.total_employees || 0}
          icon={Users}
          variant="warning"
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
                placeholder="البحث في الفروع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Add Branch */}
          <button className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة فرع</span>
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch: Branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onDelete={() => deleteMutation.mutate(branch.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface BranchCardProps {
  branch: Branch
  onDelete: () => void
}

function BranchCard({ branch, onDelete }: BranchCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Fetch branch performance
  const { data: performanceResponse } = useQuery({
    queryKey: ["branches", branch.id, "performance"],
    queryFn: () => branchService.getPerformance(branch.id),
    enabled: showDetails,
  })

  const performance = performanceResponse?.data

  const handleDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟`)) {
      onDelete()
      setIsMenuOpen(false)
    }
  }

  return (
    <div className="flat-card hover-lift p-6">
      {/* Header */}
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
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-48 flat-card p-2 z-20 shadow-flat-lg">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        {branch.address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{branch.address}</span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{branch.phone}</span>
          </div>
        )}
        {branch.manager && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>المدير: {branch.manager.name}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
            branch.is_active
              ? "bg-success-light text-success"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {branch.is_active ? "نشط" : "غير نشط"}
        </span>
      </div>

      {/* Performance Section */}
      {!showDetails ? (
        <button
          onClick={() => setShowDetails(true)}
          className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          عرض التفاصيل ←
        </button>
      ) : (
        <div className="pt-4 border-t border-border space-y-3">
          {performance ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">المبيعات اليوم</span>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(performance.today_sales || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الطلبات اليوم</span>
                <span className="text-sm font-semibold">{performance.today_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">المنتجات</span>
                <span className="text-sm font-semibold">{performance.products_count || 0}</span>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                إخفاء التفاصيل ↑
              </button>
            </>
          ) : (
            <div className="flex justify-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
