import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, MoreVertical, Trash2, Package, Clock, CheckCircle, XCircle,
  TrendingUp, Calendar, X, Loader2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { purchaseOrderService, supplierService, branchService } from "@/services/api.service"
import toast from "react-hot-toast"
import api from "@/lib/api"

type StatusFilter = "all" | "pending" | "ordered" | "received" | "cancelled"

export default function PurchaseOrders() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["purchase-orders", searchTerm, statusFilter, currentPage],
    queryFn: () => purchaseOrderService.getAll({
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ["purchase-orders", "statistics"],
    queryFn: () => purchaseOrderService.getStatistics(),
  })

  const orders: any[] = ordersResponse?.data || []
  const stats = statsResponse?.data

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderService.delete(id),
    onSuccess: () => {
      toast.success("تم حذف الطلب")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحذف"),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      purchaseOrderService.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success("تم تحديث الحالة")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل التحديث"),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => purchaseOrderService.create(data),
    onSuccess: () => {
      toast.success("تم إنشاء طلب الشراء")
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      setShowCreate(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الإنشاء"),
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "معلق", icon: Clock, className: "bg-warning-light text-warning" }
      case "ordered":
        return { label: "تم الطلب", icon: Package, className: "bg-info/10 text-info" }
      case "received":
        return { label: "مستلم", icon: CheckCircle, className: "bg-success-light text-success" }
      case "cancelled":
        return { label: "ملغي", icon: XCircle, className: "bg-destructive/10 text-destructive" }
      default:
        return { label: status, icon: Clock, className: "bg-muted text-muted-foreground" }
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الطلبات" value={Number(stats?.total ?? orders.length)} icon={Package} variant="primary" />
        <StatCard title="معلق" value={Number(stats?.pending ?? 0)} icon={Clock} variant="warning" />
        <StatCard title="مستلم" value={Number(stats?.received ?? 0)} icon={CheckCircle} variant="success" />
        <StatCard title="قيمة هذا الشهر" value={formatCurrency(Number(stats?.this_month_total || 0))} icon={TrendingUp} variant="info" />
      </div>

      <div className="flat-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث برقم الطلب أو اسم المورد..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1) }}
            className="h-10 px-4 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">معلق</option>
            <option value="ordered">تم الطلب</option>
            <option value="received">مستلم</option>
            <option value="cancelled">ملغي</option>
          </select>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">طلب شراء جديد</span>
          </button>
        </div>
      </div>

      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد طلبات شراء</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["رقم الطلب", "المورد", "الفرع", "تاريخ الطلب", "التاريخ المتوقع", "المبلغ", "الحالة", "إجراءات"].map(h => (
                    <th key={h} className="text-right text-sm font-medium text-muted-foreground py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const statusBadge = getStatusBadge(order.status)
                  const StatusIcon = statusBadge.icon
                  return (
                    <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-4 px-4 font-mono font-medium">#{order.orderNumber}</td>
                      <td className="py-4 px-4 text-sm">{order.supplier?.name || "—"}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{order.branch?.name || "—"}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {order.orderDate ? formatDate(order.orderDate) : "—"}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : "—"}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-primary">
                        {formatCurrency(Number(order.totalAmount || 0))}
                      </td>
                      <td className="py-4 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", statusBadge.className)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <PurchaseOrderActionsMenu
                          order={order}
                          onDelete={() => deleteMutation.mutate(order.id)}
                          onUpdateStatus={(status) => updateStatusMutation.mutate({ id: order.id, status })}
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

      {showCreate && (
        <CreatePurchaseDialog
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          submitting={createMutation.isPending}
        />
      )}
    </div>
  )
}

function CreatePurchaseDialog({ onClose, onSubmit, submitting }: any) {
  const { data: suppliersRes } = useQuery({ queryKey: ["suppliers-list"], queryFn: () => supplierService.getAll({ limit: 100 }) })
  const { data: branchesRes } = useQuery({ queryKey: ["branches-list"], queryFn: () => branchService.getAll() })
  const suppliers: any[] = suppliersRes?.data || []
  const branches: any[] = branchesRes?.data || []

  const [supplierId, setSupplierId] = useState("")
  const [branchId, setBranchId] = useState("")
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState([{ productId: 0, quantityOrdered: 1, unitCost: 0, product: null as any }])
  const [searches, setSearches] = useState([""])
  const [results, setResults] = useState<any[][]>([[]])

  const searchProduct = async (q: string, idx: number) => {
    const s = [...searches]; s[idx] = q; setSearches(s)
    if (q.length < 2) { const r = [...results]; r[idx] = []; setResults(r); return }
    const res = await api.get('/products', { params: { search: q, limit: 6 } })
    const r = [...results]; r[idx] = res.data.data || []; setResults(r)
  }

  const selectProduct = (idx: number, p: any) => {
    const ni = [...items]
    ni[idx] = { productId: p.id, quantityOrdered: 1, unitCost: Number(p.costPrice || 0), product: p }
    setItems(ni)
    const s = [...searches]; s[idx] = p.name; setSearches(s)
    const r = [...results]; r[idx] = []; setResults(r)
  }

  const handleSubmit = () => {
    if (!supplierId || !branchId) return toast.error("اختر المورد والفرع")
    if (items.some(i => !i.productId || i.quantityOrdered <= 0)) return toast.error("أضف منتجاً واحداً على الأقل")
    onSubmit({
      supplierId: parseInt(supplierId),
      branchId: parseInt(branchId),
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: expectedDeliveryDate
        ? new Date(expectedDeliveryDate + "T12:00:00").toISOString()
        : undefined,
      notes: notes || undefined,
      items: items.map(i => ({
        productId: i.productId,
        quantityOrdered: i.quantityOrdered,
        unitCost: i.unitCost,
        taxRate: 0,
        discountRate: 0,
      })),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">طلب شراء جديد</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1.5">المورد *</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background">
                <option value="">اختر المورد</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5">الفرع *</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background">
                <option value="">اختر الفرع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">المنتجات</label>
              <button type="button" onClick={() => { setItems([...items, { productId: 0, quantityOrdered: 1, unitCost: 0, product: null }]); setSearches([...searches, ""]); setResults([...results, []]) }} className="text-xs text-primary">+ إضافة منتج</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <input value={searches[idx]} onChange={e => searchProduct(e.target.value, idx)} placeholder="ابحث عن منتج..." className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background" />
                    {results[idx]?.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10">
                        {results[idx].map(p => (
                          <button key={p.id} type="button" onClick={() => selectProduct(idx, p)} className="w-full text-right px-3 py-2 text-sm hover:bg-muted flex justify-between">
                            <span>{p.name}</span><span className="text-xs text-muted-foreground">{Number(p.costPrice || 0)} ر.س</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" min={1} value={item.quantityOrdered} onChange={e => { const ni = [...items]; ni[idx].quantityOrdered = parseInt(e.target.value) || 1; setItems(ni) }} className="w-20 px-2 py-2 border rounded-xl text-sm text-center" title="الكمية" />
                  <input type="number" min={0} step="0.01" value={item.unitCost} onChange={e => { const ni = [...items]; ni[idx].unitCost = parseFloat(e.target.value) || 0; setItems(ni) }} className="w-24 px-2 py-2 border rounded-xl text-sm text-center" title="سعر الوحدة" />
                  {items.length > 1 && <button type="button" onClick={() => { setItems(items.filter((_, i) => i !== idx)); setSearches(searches.filter((_, i) => i !== idx)); setResults(results.filter((_, i) => i !== idx)) }} className="p-2 text-destructive"><X className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5">التاريخ المتوقع للتسليم</label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={e => setExpectedDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background" />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-xl text-sm">إلغاء</button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm flex items-center gap-2 disabled:opacity-60">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} حفظ الطلب
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PurchaseOrderActionsMenu({ order, onDelete, onUpdateStatus }: any) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuWidth = 192
      const menuHeight = 180
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
            {order.status === "pending" && (
              <button onClick={() => { onUpdateStatus("ordered"); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg">تأكيد الطلب</button>
            )}
            {(order.status === "pending" || order.status === "ordered") && (
              <button onClick={() => { onUpdateStatus("received"); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg">تم الاستلام</button>
            )}
            {order.status !== "cancelled" && order.status !== "received" && (
              <button onClick={() => { onUpdateStatus("cancelled"); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg">إلغاء</button>
            )}
            <button onClick={() => { if (window.confirm("حذف الطلب؟")) onDelete(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" /> حذف
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
