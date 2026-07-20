import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, RotateCcw, DollarSign, Package, Calendar, Eye, X, Loader2, CheckCircle,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { ExportMenu } from "@/components/ui/ExportMenu"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface ReturnItem {
  productId: number
  quantity: number
  unitPrice: number
  product?: { id: number; name: string }
}

interface SaleReturn {
  id: number
  returnNumber: string
  saleId: number
  sale: { id: number; invoiceNumber: string }
  userId: number
  user: { id: number; name: string }
  branch: { id: number; name: string }
  returnDate: string
  reason: string
  refundMethod: "cash" | "credit"
  totalRefund: number
  notes?: string
  items: Array<{
    id: number
    product: { id: number; name: string; sku: string }
    quantity: number
    unitPrice: number
    totalAmount: number
  }>
  createdAt: string
}

interface Sale {
  id: number
  invoiceNumber: string
  totalAmount: number
  branchId?: number
  items: Array<{
    id: number
    productId: number
    product: { id: number; name: string; sku: string }
    quantity: number
    unitPrice: number
    totalAmount: number
  }>
}

const returnsApi = {
  getAll: (params: any) => api.get('/returns', { params }).then(r => r.data),
  getStats: () => api.get('/returns/statistics').then(r => r.data),
  create: (data: any) => api.post('/returns', data).then(r => r.data),
}

const salesApi = {
  getById: (id: number) => api.get(`/sales/${id}`).then(r => r.data),
}

export default function Returns() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [viewReturn, setViewReturn] = useState<SaleReturn | null>(null)

  // New return form state
  const [invoiceInput, setInvoiceInput] = useState("")
  const [foundSale, setFoundSale] = useState<Sale | null>(null)
  const [searchingSale, setSearchingSale] = useState(false)
  const [selectedItems, setSelectedItems] = useState<ReturnItem[]>([])
  const [reason, setReason] = useState("")
  const [refundMethod, setRefundMethod] = useState<"cash" | "credit">("cash")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const { data: returnsResponse, isLoading, isError: returnsError, error: returnsErr } = useQuery({
    queryKey: ["returns", debouncedSearch, currentPage],
    queryFn: () => returnsApi.getAll({ search: debouncedSearch || undefined, page: currentPage, limit: 20 }),
    retry: 1,
  })

  const { data: statsResponse, isError: statsError } = useQuery({
    queryKey: ["returns", "statistics"],
    queryFn: returnsApi.getStats,
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: returnsApi.create,
    onSuccess: () => {
      toast.success("تم إنشاء المرتجع وتحديث المخزون بنجاح")
      queryClient.invalidateQueries({ queryKey: ["returns"] })
      queryClient.invalidateQueries({ queryKey: ["returns", "statistics"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      resetDialog()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إنشاء المرتجع")
    },
  })

  const resetDialog = () => {
    setShowDialog(false)
    setInvoiceInput("")
    setFoundSale(null)
    setSelectedItems([])
    setReason("")
    setRefundMethod("cash")
    setNotes("")
  }

  const searchSale = async () => {
    if (!invoiceInput.trim()) return
    setSearchingSale(true)
    try {
      const res = await api.get(`/sales/invoice/${invoiceInput.trim()}`)
      setFoundSale(res.data.data)
      setSelectedItems(
        res.data.data.items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          product: i.product,
        }))
      )
    } catch {
      toast.error("لم يتم العثور على الفاتورة")
      setFoundSale(null)
    } finally {
      setSearchingSale(false)
    }
  }

  const handleSubmit = () => {
    if (!foundSale) return toast.error("ابحث عن فاتورة أولاً")
    if (!reason.trim()) return toast.error("يجب إدخال سبب الإرجاع")
    const items = selectedItems.filter(i => i.quantity > 0)
    if (!items.length) return toast.error("حدد منتجاً واحداً على الأقل بكمية أكبر من صفر")
    createMutation.mutate({
      saleId: foundSale.id,
      branchId: foundSale.branchId || 1,
      reason: reason.trim(),
      refundMethod,
      notes: notes.trim() || undefined,
      items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    })
  }

  const returns = Array.isArray(returnsResponse?.data) ? returnsResponse.data : []
  const rawStats = (statsResponse && typeof statsResponse === "object" && "data" in statsResponse)
    ? (statsResponse as any).data
    : statsResponse
  const pagination = returnsResponse?.pagination

  // Dynamic stats from API (with list fallback if stats request fails)
  const stats = {
    total: Number(rawStats?.total ?? pagination?.total ?? returns.length ?? 0),
    totalAmount: Number(rawStats?.totalAmount ?? rawStats?.total_amount ?? 0),
    cashRefunds: Number(rawStats?.cashRefunds ?? rawStats?.cash_refunds ?? 0),
    creditRefunds: Number(rawStats?.creditRefunds ?? rawStats?.credit_refunds ?? 0),
  }

  // If stats endpoint failed, derive amounts from currently loaded returns
  if (statsError || (!rawStats && returns.length > 0)) {
    stats.total = Number(pagination?.total ?? returns.length)
    stats.totalAmount = returns.reduce((s: number, r: SaleReturn) => s + Number(r.totalRefund || 0), 0)
    stats.cashRefunds = returns
      .filter((r: SaleReturn) => r.refundMethod === "cash")
      .reduce((s: number, r: SaleReturn) => s + Number(r.totalRefund || 0), 0)
    stats.creditRefunds = returns
      .filter((r: SaleReturn) => r.refundMethod === "credit")
      .reduce((s: number, r: SaleReturn) => s + Number(r.totalRefund || 0), 0)
  }

  return (
    <div className="space-y-6">
      {returnsError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(returnsErr as any)?.response?.data?.message || "تعذر تحميل المرتجعات. سجّل الخروج ثم الدخول مجدداً."}
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المرتجعات"
          value={stats.total}
          icon={RotateCcw}
          variant="primary"
          subtitle={`${stats.total} مرتجع مسجل`}
        />
        <StatCard
          title="إجمالي المبالغ المستردة"
          value={formatCurrency(stats.totalAmount)}
          icon={DollarSign}
          variant="destructive"
          subtitle="كل طرق الاسترداد"
        />
        <StatCard
          title="استرداد نقدي"
          value={formatCurrency(stats.cashRefunds)}
          icon={Package}
          variant="success"
          subtitle="نقداً للعميل"
        />
        <StatCard
          title="استرداد رصيد"
          value={formatCurrency(stats.creditRefunds)}
          icon={Calendar}
          variant="info"
          subtitle="إضافة لرصيد العميل"
        />
      </div>

      {/* Header + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المرتجعات</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة مرتجعات المبيعات</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename={`مرتجعات-${new Date().toISOString().slice(0, 10)}`}
            title="المرتجعات"
            columns={[
              { key: "returnNumber", label: "رقم المرتجع" },
              { key: "invoiceNumber", label: "الفاتورة الأصلية" },
              { key: "returnDate", label: "التاريخ" },
              { key: "reason", label: "السبب" },
              { key: "refundMethod", label: "طريقة الاسترداد" },
              { key: "totalRefund", label: "المبلغ" },
            ]}
            rows={returns.map((r: SaleReturn) => ({
              returnNumber: r.returnNumber,
              invoiceNumber: r.sale?.invoiceNumber || "",
              returnDate: r.returnDate,
              reason: r.reason || "",
              refundMethod: r.refundMethod === "cash" ? "نقدي" : "رصيد عميل",
              totalRefund: Number(r.totalRefund || 0),
            }))}
            dateKey="returnDate"
          />
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة مرتجع</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث برقم المرتجع أو الفاتورة أو السبب..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="w-full pr-10 pl-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : returns.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد مرتجعات حتى الآن</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["رقم المرتجع", "الفاتورة الأصلية", "التاريخ", "السبب", "طريقة الاسترداد", "المبلغ", "إجراءات"].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returns.map((ret: SaleReturn) => (
                  <tr key={ret.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary">{ret.returnNumber}</td>
                    <td className="px-4 py-3 font-mono">{ret.sale?.invoiceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(ret.returnDate)}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{ret.reason}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", ret.refundMethod === "cash" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>
                        {ret.refundMethod === "cash" ? "نقدي" : "رصيد"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-destructive">{formatCurrency(Number(ret.totalRefund))}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewReturn(ret)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">إجمالي: {pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 rounded-lg border border-border text-sm disabled:opacity-40">السابق</button>
              <span className="px-3 py-1 text-sm">{currentPage} / {pagination.totalPages}</span>
              <button disabled={currentPage === pagination.totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 rounded-lg border border-border text-sm disabled:opacity-40">التالي</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Return Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">إضافة مرتجع جديد</h2>
              <button onClick={resetDialog} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Invoice Search */}
              <div>
                <label className="block text-sm font-medium mb-1.5">رقم الفاتورة الأصلية</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invoiceInput}
                    onChange={e => setInvoiceInput(e.target.value)}
                    placeholder="مثال: INV-20260718-0001"
                    className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    onKeyDown={e => e.key === "Enter" && searchSale()}
                  />
                  <button
                    onClick={searchSale}
                    disabled={searchingSale}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 flex items-center gap-2"
                  >
                    {searchingSale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    بحث
                  </button>
                </div>
              </div>

              {foundSale && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">فاتورة: <strong>{foundSale.invoiceNumber}</strong> — الإجمالي: {formatCurrency(Number(foundSale.totalAmount))}</span>
                  </div>

                  {/* Items */}
                  <div>
                    <label className="block text-sm font-medium mb-2">المنتجات المرتجعة</label>
                    <div className="space-y-2">
                      {selectedItems.map((item, i) => (
                        <div key={item.productId} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                          <span className="flex-1 text-sm font-medium">{item.product?.name}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} / وحدة</span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground">الكمية:</label>
                            <input
                              type="number"
                              min={0}
                              max={foundSale.items[i]?.quantity}
                              value={item.quantity}
                              onChange={e => {
                                const newItems = [...selectedItems]
                                newItems[i].quantity = parseInt(e.target.value) || 0
                                setSelectedItems(newItems)
                              }}
                              className="w-16 px-2 py-1 border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">سبب الإرجاع <span className="text-destructive">*</span></label>
                      <input
                        type="text"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="منتج تالف / غير مطابق..."
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">طريقة الاسترداد</label>
                      <select
                        value={refundMethod}
                        onChange={e => setRefundMethod(e.target.value as "cash" | "credit")}
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none bg-background"
                      >
                        <option value="cash">نقدي</option>
                        <option value="credit">إضافة لرصيد العميل</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">ملاحظات (اختياري)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-semibold">
                      إجمالي الاسترداد: <span className="text-destructive">{formatCurrency(selectedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</span>
                    </span>
                    <div className="flex gap-3">
                      <button onClick={resetDialog} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">إلغاء</button>
                      <button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60"
                      >
                        {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        تأكيد المرتجع
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Return Dialog */}
      {viewReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">تفاصيل المرتجع — {viewReturn.returnNumber}</h2>
              <button onClick={() => setViewReturn(null)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">الفاتورة الأصلية:</span> <strong>{viewReturn.sale?.invoiceNumber}</strong></div>
                <div><span className="text-muted-foreground">التاريخ:</span> <strong>{formatDate(viewReturn.returnDate)}</strong></div>
                <div><span className="text-muted-foreground">طريقة الاسترداد:</span> <strong>{viewReturn.refundMethod === "cash" ? "نقدي" : "رصيد"}</strong></div>
                <div><span className="text-muted-foreground">إجمالي الاسترداد:</span> <strong className="text-destructive">{formatCurrency(Number(viewReturn.totalRefund))}</strong></div>
                <div className="col-span-2"><span className="text-muted-foreground">السبب:</span> <strong>{viewReturn.reason}</strong></div>
                {viewReturn.notes && <div className="col-span-2"><span className="text-muted-foreground">ملاحظات:</span> <strong>{viewReturn.notes}</strong></div>}
              </div>
              <div>
                <h3 className="font-semibold mb-2">المنتجات المرتجعة</h3>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["المنتج", "الكمية", "السعر", "الإجمالي"].map(h => <th key={h} className="px-3 py-2 text-right font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {viewReturn.items.map(item => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-3 py-2">{item.product.name}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatCurrency(Number(item.unitPrice))}</td>
                        <td className="px-3 py-2 font-medium">{formatCurrency(Number(item.totalAmount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
