import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Star,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency } from "@/lib/utils"
import { customerService } from "@/services/api.service"
import type { Customer } from "@/types"

export default function Customers() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch customers
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ["customers", searchTerm, statusFilter, currentPage],
    queryFn: () => customerService.getAll({
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["customers", "statistics"],
    queryFn: () => customerService.getStatistics(),
  })

  const customers = customersResponse?.data || []
  const stats = statsResponse?.data

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })

  const filteredCustomers = customers.filter((customer: Customer) => {
    if (statusFilter === "all") return true
    return customer.status === statusFilter
  })

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي العملاء"
          value={stats?.total || customers.length}
          icon={UsersIcon}
          variant="primary"
        />
        <StatCard
          title="عملاء معتمدين"
          value={stats?.approved || customers.filter((c: Customer) => c.status === "approved").length}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="بانتظار الموافقة"
          value={stats?.pending || customers.filter((c: Customer) => c.status === "pending").length}
          icon={UserX}
          variant="warning"
        />
        <StatCard
          title="عملاء VIP"
          value={stats?.vip || customers.filter((c: Customer) => c.is_vip).length}
          icon={Star}
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
                placeholder="البحث في العملاء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                statusFilter === "all"
                  ? "bg-card text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                statusFilter === "approved"
                  ? "bg-card text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              معتمد
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                statusFilter === "pending"
                  ? "bg-card text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              معلق
            </button>
          </div>

          {/* Add Customer */}
          <button className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة عميل</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
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
                    اسم العميل
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    رقم الهاتف
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الحالة
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    VIP
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    تاريخ التسجيل
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer: Customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium text-foreground">{customer.name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "inline-flex px-2 py-1 rounded-md text-xs font-medium",
                          customer.status === "approved"
                            ? "bg-success-light text-success"
                            : "bg-warning-light text-warning"
                        )}
                      >
                        {customer.status === "approved" ? "معتمد" : "معلق"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {customer.is_vip && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span className="text-xs font-medium text-warning">VIP</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(customer.created_at).toLocaleDateString("ar-EG")}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <CustomerActionsMenu
                        customerId={customer.id}
                        onDelete={() => deleteMutation.mutate(customer.id)}
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

interface CustomerActionsMenuProps {
  customerId: number
  onDelete: () => void
}

function CustomerActionsMenu({ customerId, onDelete }: CustomerActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا العميل؟")) {
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
              تحديث الرصيد
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
