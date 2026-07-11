import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  RotateCcw,
  DollarSign,
  Package,
  AlertCircle,
  Calendar,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { saleService } from "@/services/api.service"

interface SaleReturn {
  id: number
  sale_id: number
  sale: {
    id: number
    invoice_number: string
  }
  product_id: number
  product: {
    id: number
    name: string
  }
  quantity: number
  refund_amount: number
  refund_method: "cash" | "credit"
  reason: string
  return_type: "single" | "full_invoice"
  created_at: string
  updated_at: string
}

type RefundMethodFilter = "all" | "cash" | "credit"

export default function Returns() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [refundMethodFilter, setRefundMethodFilter] = useState<RefundMethodFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [showReturnDialog, setShowReturnDialog] = useState(false)

  // Fetch returns - using sales endpoint for now
  const { data: returnsResponse, isLoading } = useQuery({
    queryKey: ["returns", searchTerm, refundMethodFilter, currentPage],
    queryFn: () => saleService.getAll({
      search: searchTerm || undefined,
      status: "returned",
      page: currentPage,
      limit: 50,
    }),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["returns", "statistics"],
    queryFn: () => saleService.getStatistics({ type: "returns" }),
  })

  const returns = returnsResponse?.data || []
  const stats = statsResponse?.data

  const getRefundMethodLabel = (method: string) => {
    return method === "cash" ? "نقدي" : "رصيد"
  }

  const getReturnTypeLabel = (type: string) => {
    return type === "single" ? "منتج واحد" : "فاتورة كاملة"
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المرتجعات"
          value={stats?.total || returns.length}
          icon={RotateCcw}
          variant="primary"
        />
        <StatCard
          title="قيمة المرتجعات"
          value={formatCurrency(stats?.total_amount || 0)}
          icon={DollarSign}
          variant="warning"
        />
        <StatCard
          title="مرتجعات نقدية"
          value={formatCurrency(stats?.cash_refunds || 0)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="مرتجعات رصيد"
          value={formatCurrency(stats?.credit_refunds || 0)}
          icon={Package}
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
                placeholder="البحث برقم الفاتورة أو اسم المنتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Refund Method Filter */}
          <select
            value={refundMethodFilter}
            onChange={(e) => setRefundMethodFilter(e.target.value as RefundMethodFilter)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع طرق الاسترجاع</option>
            <option value="cash">نقدي</option>
            <option value="credit">رصيد</option>
          </select>

          {/* Add Return */}
          <button 
            onClick={() => setShowReturnDialog(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">مرتجع جديد</span>
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RotateCcw className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-foreground font-semibold mb-2">لا توجد مرتجعات</p>
            <p className="text-sm text-muted-foreground">ابدأ بإضافة مرتجع جديد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    رقم الفاتورة
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المنتج
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الكمية
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المبلغ المسترجع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    طريقة الاسترجاع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    نوع المرتجع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    السبب
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
                {/* Placeholder data - replace with actual data */}
                <tr className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>قريباً - سيتم عرض المرتجعات هنا</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return Dialog */}
      {showReturnDialog && (
        <ReturnDialog onClose={() => setShowReturnDialog(false)} />
      )}
    </div>
  )
}

interface ReturnDialogProps {
  onClose: () => void
}

function ReturnDialog({ onClose }: ReturnDialogProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [returnType, setReturnType] = useState<"single" | "full_invoice">("single")
  const [refundMethod, setRefundMethod] = useState<"cash" | "credit">("cash")
  const [reason, setReason] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement return logic
    alert("سيتم تنفيذ المرتجع قريباً")
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl flat-card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-foreground mb-6">مرتجع جديد</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              رقم الفاتورة *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="أدخل رقم الفاتورة"
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Return Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              نوع المرتجع *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReturnType("single")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  returnType === "single"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-semibold">منتج واحد</p>
              </button>
              <button
                type="button"
                onClick={() => setReturnType("full_invoice")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  returnType === "full_invoice"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RotateCcw className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-semibold">فاتورة كاملة</p>
              </button>
            </div>
          </div>

          {/* Refund Method */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              طريقة الاسترجاع *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRefundMethod("cash")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  refundMethod === "cash"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-semibold">استرجاع نقدي</p>
              </button>
              <button
                type="button"
                onClick={() => setRefundMethod("credit")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  refundMethod === "credit"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-semibold">رصيد للعميل</p>
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              سبب الإرجاع *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر سبب الإرجاع..."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              required
            />
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
              تأكيد المرتجع
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
