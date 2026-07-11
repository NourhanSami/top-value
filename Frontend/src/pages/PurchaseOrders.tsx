import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { purchaseOrderService } from "@/services/api.service"

interface PurchaseOrder {
  id: number
  order_number: string
  supplier_id: number
  supplier: {
    id: number
    name: string
  }
  branch_id: number
  branch: {
    id: number
    name: string
  }
  order_date: string
  expected_date?: string
  total_amount: number
  status: "pending" | "ordered" | "received" | "cancelled"
  notes?: string
  created_at: string
  updated_at: string
}

type StatusFilter = "all" | "pending" | "ordered" | "received" | "cancelled"

export default function PurchaseOrders() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch purchase orders
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["purchase-orders", searchTerm, statusFilter, currentPage],
    queryFn: () => purchaseOrderService.getAll({
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["purchase-orders", "statistics"],
    queryFn: () => purchaseOrderService.getStatistics(),
  })

  const orders = ordersResponse?.data || []
  const stats = statsResponse?.data

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      purchaseOrderService.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "معلق",
          icon: Clock,
          className: "bg-warning-light text-warning",
        }
      case "ordered":
        return {
          label: "تم الطلب",
          icon: Package,
          className: "bg-info/10 text-info",
        }
      case "received":
        return {
          label: "مستلم",
          icon: CheckCircle,
          className: "bg-success-light text-success",
        }
      case "cancelled":
        return {
          label: "ملغي",
          icon: XCircle,
          className: "bg-destructive/10 text-destructive",
        }
      default:
        return {
          label: status,
          icon: Clock,
          className: "bg-muted text-muted-foreground",
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الطلبات"
          value={stats?.total || orders.length}
          icon={Package}
          variant="primary"
        />
        <StatCard
          title="معلق"
          value={stats?.pending || orders.filter((o: PurchaseOrder) => o.status === "pending").length}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="مستلم"
          value={stats?.received || orders.filter((o: PurchaseOrder) => o.status === "received").length}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="قيمة هذا الشهر"
          value={formatCurrency(stats?.this_month_total || 0)}
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
                placeholder="البحث في طلبات الشراء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">معلق</option>
            <option value="ordered">تم الطلب</option>
            <option value="received">مستلم</option>
            <option value="cancelled">ملغي</option>
          </select>

          {/* Add Purchase Order */}
          <button className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">طلب شراء جديد</span>
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
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
                    رقم الطلب
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المورد
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الفرع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    تاريخ الطلب
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    التاريخ المتوقع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المبلغ
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الحالة
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: PurchaseOrder) => {
                  const statusBadge = getStatusBadge(order.status)
                  const StatusIcon = statusBadge.icon

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium text-foreground font-mono">
                          #{order.order_number}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-foreground">{order.supplier.name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-muted-foreground">{order.branch.name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {formatDate(order.order_date)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-foreground">
                          {order.expected_date ? formatDate(order.expected_date) : "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                            statusBadge.className
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <PurchaseOrderActionsMenu
                          order={order}
                          onDelete={() => deleteMutation.mutate(order.id)}
                          onUpdateStatus={(status) =>
                            updateStatusMutation.mutate({ id: order.id, status })
                          }
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
    </div>
  )
}

interface PurchaseOrderActionsMenuProps {
  order: PurchaseOrder
  onDelete: () => void
  onUpdateStatus: (status: string) => void
}

function PurchaseOrderActionsMenu({
  order,
  onDelete,
  onUpdateStatus,
}: PurchaseOrderActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
      onDelete()
      setIsOpen(false)
    }
  }

  const handleReceive = () => {
    if (window.confirm("هل تم استلام جميع المنتجات؟")) {
      onUpdateStatus("received")
      setIsOpen(false)
    }
  }

  const handleCancel = () => {
    if (window.confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) {
      onUpdateStatus("cancelled")
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
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-48 flat-card p-2 z-20 shadow-flat-lg">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
              تعديل
            </button>

            {order.status === "pending" && (
              <button
                onClick={() => onUpdateStatus("ordered")}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <Package className="w-4 h-4" />
                تأكيد الطلب
              </button>
            )}

            {order.status === "ordered" && (
              <button
                onClick={handleReceive}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success hover:bg-success-light rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد الاستلام
              </button>
            )}

            {(order.status === "pending" || order.status === "ordered") && (
              <button
                onClick={handleCancel}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warning hover:bg-warning-light rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                إلغاء الطلب
              </button>
            )}

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
