import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Search, FileText, ArrowRight, X, Loader2, CheckCircle, Clock, XCircle, Eye } from "lucide-react"
import { ExportMenu } from "@/components/ui/ExportMenu"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface QuotationItem {
  productId: number
  product?: { id: number; name: string; sku: string }
  quantity: number
  unitPrice: number
  discountRate: number
  taxRate: number
  totalAmount: number
}

interface Quotation {
  id: number
  quotationNumber: string
  customer?: { id: number; name: string; phone: string }
  branch: { id: number; name: string }
  user: { id: number; name: string }
  quotationDate: string
  validUntil?: string
  status: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  notes?: string
  terms?: string
  convertedToSale: boolean
  items: QuotationItem[]
}

const quotationsApi = {
  getAll: (params?: any) => api.get('/quotations', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/quotations/${id}`).then(r => r.data),
  create: (data: any) => api.post('/quotations', data).then(r => r.data),
  updateStatus: (id: number, status: string) => api.put(`/quotations/${id}/status`, { status }).then(r => r.data),
  convert: (id: number, data: any) => api.post(`/quotations/${id}/convert`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/quotations/${id}`).then(r => r.data),
}

const productsApi = {
  search: (q: string) => api.get('/products', { params: { search: q, limit: 10 } }).then(r => r.data),
}

const customersApi = {
  getAll: () => api.get('/customers', { params: { limit: 100 } }).then(r => r.data),
}

const statusLabel: Record<string, { label: string; icon: any; cls: string }> = {
  draft: { label: "مسودة", icon: Clock, cls: "bg-gray-100 text-gray-600" },
  sent: { label: "مرسل", icon: FileText, cls: "bg-blue-100 text-blue-600" },
  accepted: { label: "مقبول", icon: CheckCircle, cls: "bg-green-100 text-green-600" },
  rejected: { label: "مرفوض", icon: XCircle, cls: "bg-red-100 text-red-600" },
  expired: { label: "منتهي", icon: Clock, cls: "bg-orange-100 text-orange-600" },
}

export default function Quotations() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState<Quotation | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)

  const { data: qRes, isLoading } = useQuery({ queryKey: ["quotations", searchTerm, statusFilter, page], queryFn: () => quotationsApi.getAll({ search: searchTerm || undefined, status: statusFilter || undefined, page, limit: 20 }) })
  const { data: customersRes } = useQuery({ queryKey: ["customers-list"], queryFn: customersApi.getAll })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => quotationsApi.updateStatus(id, status),
    onSuccess: () => { toast.success("تم تحديث الحالة"); queryClient.invalidateQueries({ queryKey: ["quotations"] }) },
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => quotationsApi.convert(id, data),
    onSuccess: () => { toast.success("تم تحويل العرض إلى فاتورة بنجاح!"); queryClient.invalidateQueries({ queryKey: ["quotations"] }); setViewing(null) },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ أثناء التحويل"),
  })

  const deleteMutation = useMutation({
    mutationFn: quotationsApi.delete,
    onSuccess: () => { toast.success("تم الحذف"); queryClient.invalidateQueries({ queryKey: ["quotations"] }) },
  })

  const quotations: Quotation[] = qRes?.data || []
  const pagination = qRes?.pagination
  const customers: any[] = customersRes?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">عروض الأسعار</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة عروض الأسعار وتحويلها إلى فواتير</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename={`عروض-أسعار-${new Date().toISOString().slice(0, 10)}`}
            title="عروض الأسعار"
            columns={[
              { key: "quotationNumber", label: "رقم العرض" },
              { key: "customer", label: "العميل" },
              { key: "quotationDate", label: "التاريخ" },
              { key: "validUntil", label: "الصلاحية" },
              { key: "status", label: "الحالة" },
              { key: "totalAmount", label: "الإجمالي" },
            ]}
            rows={quotations.map((q) => ({
              quotationNumber: q.quotationNumber,
              customer: q.customer?.name || "",
              quotationDate: q.quotationDate,
              validUntil: q.validUntil || "",
              status: statusLabel[q.status]?.label || q.status,
              totalAmount: Number(q.totalAmount || 0),
            }))}
            dateKey="quotationDate"
          />
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium">
            <Plus className="w-4 h-4" /> عرض سعر جديد
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث برقم العرض..." className="w-full pr-9 pl-4 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
          <option value="">جميع الحالات</option>
          {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          : quotations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد عروض أسعار</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["رقم العرض", "العميل", "التاريخ", "الصلاحية", "الحالة", "الإجمالي", "إجراءات"].map(h => <th key={h} className="px-4 py-3 text-right font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {quotations.map(q => {
                    const s = statusLabel[q.status] || statusLabel.draft
                    return (
                      <tr key={q.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-primary">{q.quotationNumber}</td>
                        <td className="px-4 py-3">{q.customer?.name || <span className="text-muted-foreground">عميل غير محدد</span>}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(q.quotationDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{q.validUntil ? formatDate(q.validUntil) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", s.cls)}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(Number(q.totalAmount))}</td>
                        <td className="px-4 py-3 flex items-center gap-1">
                          <button onClick={() => setViewing(q)} className="p-1.5 hover:bg-muted rounded-lg" title="عرض"><Eye className="w-4 h-4 text-muted-foreground" /></button>
                          {!q.convertedToSale && q.status !== "rejected" && (
                            <button onClick={() => convertMutation.mutate({ id: q.id })} className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" /> تحويل
                            </button>
                          )}
                          <button onClick={() => deleteMutation.mutate(q.id)} className="p-1.5 hover:bg-red-100 rounded-lg" title="حذف"><X className="w-4 h-4 text-red-500" /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">السابق</button>
            <span className="px-3 py-1 text-sm">{page} / {pagination.totalPages}</span>
            <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">التالي</button>
          </div>
        )}
      </div>

      {showCreate && <CreateQuotationDialog customers={customers} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ["quotations"] }) }} />}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">عرض السعر — {viewing.quotationNumber}</h2>
              <button onClick={() => setViewing(null)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">العميل:</span> <strong>{viewing.customer?.name || "—"}</strong></div>
                <div><span className="text-muted-foreground">التاريخ:</span> <strong>{formatDate(viewing.quotationDate)}</strong></div>
                <div><span className="text-muted-foreground">الحالة:</span> <strong>{statusLabel[viewing.status]?.label}</strong></div>
                <div><span className="text-muted-foreground">صالح حتى:</span> <strong>{viewing.validUntil ? formatDate(viewing.validUntil) : "—"}</strong></div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>{["المنتج", "الكمية", "السعر", "الخصم%", "الضريبة%", "الإجمالي"].map(h => <th key={h} className="px-3 py-2 text-right">{h}</th>)}</tr></thead>
                <tbody>
                  {viewing.items.map((item, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{item.product?.name}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="px-3 py-2">{item.discountRate}%</td>
                      <td className="px-3 py-2">{item.taxRate}%</td>
                      <td className="px-3 py-2 font-semibold">{formatCurrency(Number(item.totalAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col items-end gap-1 pt-2">
                <span className="text-muted-foreground">المجموع: {formatCurrency(Number(viewing.subtotal))}</span>
                {Number(viewing.discountAmount) > 0 && <span className="text-red-600">الخصم: -{formatCurrency(Number(viewing.discountAmount))}</span>}
                {Number(viewing.taxAmount) > 0 && <span className="text-muted-foreground">الضريبة: {formatCurrency(Number(viewing.taxAmount))}</span>}
                <span className="text-lg font-bold">الإجمالي: {formatCurrency(Number(viewing.totalAmount))}</span>
              </div>
              {!viewing.convertedToSale && (
                <div className="flex gap-2 pt-2">
                  {viewing.status !== "sent" && <button onClick={() => { updateStatus.mutate({ id: viewing.id, status: "sent" }); setViewing({ ...viewing, status: "sent" }) }} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs">تحديد كـ "مرسل"</button>}
                  {viewing.status !== "accepted" && <button onClick={() => { updateStatus.mutate({ id: viewing.id, status: "accepted" }); setViewing({ ...viewing, status: "accepted" }) }} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs">تحديد كـ "مقبول"</button>}
                  <button onClick={() => convertMutation.mutate({ id: viewing.id })} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs">
                    {convertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />} تحويل إلى فاتورة
                  </button>
                </div>
              )}
              {viewing.convertedToSale && <p className="text-green-600 font-medium text-xs">✓ تم تحويل هذا العرض إلى فاتورة</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Create Quotation Dialog =====
function CreateQuotationDialog({ customers, onClose, onSuccess }: { customers: any[]; onClose: () => void; onSuccess: () => void }) {
  const [customerId, setCustomerId] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")
  const [items, setItems] = useState<any[]>([{ productId: "", quantity: 1, unitPrice: 0, discountRate: 0, taxRate: 15 }])
  const [productSearches, setProductSearches] = useState<string[]>([""])
  const [productResults, setProductResults] = useState<any[][]>([[]])
  const [submitting, setSubmitting] = useState(false)

  const searchProduct = async (query: string, idx: number) => {
    if (query.length < 2) { const r = [...productResults]; r[idx] = []; setProductResults(r); return }
    const res = await api.get('/products', { params: { search: query, limit: 5 } })
    const r = [...productResults]; r[idx] = res.data.data || []; setProductResults(r)
  }

  const selectProduct = (idx: number, product: any) => {
    const newItems = [...items]; newItems[idx] = { ...newItems[idx], productId: product.id, unitPrice: Number(product.sellingPrice || product.price || 0), _product: product }
    setItems(newItems)
    const s = [...productSearches]; s[idx] = product.name; setProductSearches(s)
    const r = [...productResults]; r[idx] = []; setProductResults(r)
  }

  const addItem = () => { setItems([...items, { productId: "", quantity: 1, unitPrice: 0, discountRate: 0, taxRate: 15 }]); setProductSearches([...productSearches, ""]); setProductResults([...productResults, []]) }
  const removeItem = (idx: number) => { setItems(items.filter((_, i) => i !== idx)); setProductSearches(productSearches.filter((_, i) => i !== idx)); setProductResults(productResults.filter((_, i) => i !== idx)) }

  const total = items.reduce((s, i) => {
    const sub = i.unitPrice * i.quantity
    const disc = sub * (i.discountRate / 100)
    const tax = (sub - disc) * (i.taxRate / 100)
    return s + sub - disc + tax
  }, 0)

  const handleSubmit = async () => {
    if (items.some(i => !i.productId)) return toast.error("يرجى اختيار منتج لكل صف")
    setSubmitting(true)
    try {
      await api.post('/quotations', { customerId: customerId ? parseInt(customerId) : undefined, branchId: 1, validUntil: validUntil || undefined, notes, terms, items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discountRate: i.discountRate, taxRate: i.taxRate })) })
      toast.success("تم إنشاء عرض السعر")
      onSuccess()
    } catch (e: any) {
      toast.error(e.response?.data?.message || "خطأ")
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">عرض سعر جديد</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">العميل (اختياري)</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
                <option value="">اختر العميل</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">صالح حتى</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">المنتجات</label>
              <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> إضافة صف</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <input
                      value={productSearches[idx]}
                      onChange={e => { const s = [...productSearches]; s[idx] = e.target.value; setProductSearches(s); searchProduct(e.target.value, idx) }}
                      placeholder="ابحث عن منتج..."
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                    />
                    {productResults[idx]?.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10">
                        {productResults[idx].map(p => (
                          <button key={p.id} onClick={() => selectProduct(idx, p)} className="w-full text-right px-3 py-2 text-sm hover:bg-muted flex justify-between">
                            <span>{p.name}</span><span className="text-muted-foreground">{formatCurrency(Number(p.sellingPrice || p.price))}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" min="1" value={item.quantity} onChange={e => { const n = [...items]; n[idx].quantity = parseInt(e.target.value) || 1; setItems(n) }} className="w-16 px-2 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none text-center" placeholder="الكمية" />
                  <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => { const n = [...items]; n[idx].unitPrice = parseFloat(e.target.value) || 0; setItems(n) }} className="w-24 px-2 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" placeholder="السعر" />
                  <input type="number" min="0" max="100" value={item.discountRate} onChange={e => { const n = [...items]; n[idx].discountRate = parseFloat(e.target.value) || 0; setItems(n) }} className="w-16 px-2 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none text-center" placeholder="خصم%" />
                  {items.length > 1 && <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-100 rounded-lg"><X className="w-4 h-4 text-red-500" /></button>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">الشروط والأحكام</label>
              <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none resize-none" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-bold">الإجمالي: {formatCurrency(total)}</span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">إلغاء</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
