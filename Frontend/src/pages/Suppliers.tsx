import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency } from "@/lib/utils"
import { supplierService } from "@/services/api.service"

interface Supplier {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  balance: number
  created_at: string
  updated_at: string
}

export default function Suppliers() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch suppliers
  const { data: suppliersResponse, isLoading } = useQuery({
    queryKey: ["suppliers", searchTerm, currentPage],
    queryFn: () => supplierService.getAll({
      search: searchTerm || undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["suppliers", "statistics"],
    queryFn: () => supplierService.getStatistics(),
  })

  const suppliers = suppliersResponse?.data || []
  const stats = statsResponse?.data

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
  })

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الموردين"
          value={stats?.total || suppliers.length}
          icon={Building2}
          variant="primary"
        />
        <StatCard
          title="موردين نشطين"
          value={stats?.active || suppliers.length}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="إجمالي المستحقات"
          value={formatCurrency(stats?.total_balance || 0)}
          icon={DollarSign}
          variant="warning"
        />
        <StatCard
          title="مشتريات الشهر"
          value={formatCurrency(stats?.monthly_purchases || 0)}
          icon={TrendingUp}
          variant="info"
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
                placeholder="البحث في الموردين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Add Supplier */}
          <button className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة مورد</span>
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    اسم المورد
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    رقم الهاتف
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    البريد الإلكتروني
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    العنوان
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الرصيد
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier: Supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium text-foreground">{supplier.name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{supplier.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {supplier.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{supplier.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-foreground">
                        {supplier.address || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          supplier.balance > 0
                            ? "text-warning"
                            : supplier.balance < 0
                            ? "text-success"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatCurrency(Math.abs(supplier.balance))}
                        {supplier.balance > 0 && " (مستحق)"}
                        {supplier.balance < 0 && " (فائض)"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <SupplierActionsMenu
                        supplierId={supplier.id}
                        onDelete={() => deleteMutation.mutate(supplier.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

interface SupplierActionsMenuProps {
  supplierId: number
  onDelete: () => void
}

function SupplierActionsMenu({ supplierId, onDelete }: SupplierActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا المورد؟")) {
      onDelete()
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-muted rounded transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 w-48 flat-card p-2 z-20 shadow-flat-lg">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
              تعديل
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
              <DollarSign className="w-4 h-4" />
              تسديد دفعة
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
  )
}
