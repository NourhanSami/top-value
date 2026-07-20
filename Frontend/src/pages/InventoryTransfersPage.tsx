import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ArrowLeftRight, X, Loader2, Search } from "lucide-react"
import { ExportMenu } from "@/components/ui/ExportMenu"
import { cn, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface TransferItem { productId: number; quantity: number; product?: any }

interface InventoryTransfer {
  id: number
  transferNumber: string
  fromBranch: { id: number; name: string }
  toBranch: { id: number; name: string }
  user: { id: number; name: string }
  transferDate: string
  status: string
  notes?: string
  items: Array<{ id: number; product: { id: number; name: string; sku: string }; quantity: number }>
}

const transferApi = {
  getAll: (params?: any) => api.get('/inventory-transfers', { params }).then(r => r.data),
  create: (data: any) => api.post('/inventory-transfers', data).then(r => r.data),
}
const branchesApi = { getAll: () => api.get('/branches').then(r => r.data) }

export default function InventoryTransfersPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewing, setViewing] = useState<InventoryTransfer | null>(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ["transfers", page, searchTerm],
    queryFn: () => transferApi.getAll({ page, limit: 20, search: searchTerm || undefined }),
  })
  const { data: branchesRes } = useQuery({ queryKey: ["branches"], queryFn: branchesApi.getAll })

  const createMutation = useMutation({
    mutationFn: transferApi.create,
    onSuccess: () => {
      toast.success("تم تحويل المخزون بنجاح")
      queryClient.invalidateQueries({ queryKey: ["transfers"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setShowCreate(false)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "خطأ"),
  })

  const transfers: InventoryTransfer[] = res?.data || []
  const pagination = res?.pagination
  const branches: any[] = branchesRes?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">تحويل المخزون بين الفروع</h1>
          <p className="text-sm text-muted-foreground mt-1">نقل المنتجات من فرع إلى آخر</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename={`تحويلات-مخزون-${new Date().toISOString().slice(0, 10)}`}
            title="تحويلات المخزون"
            columns={[
              { key: "transferNumber", label: "رقم التحويل" },
              { key: "fromBranch", label: "من فرع" },
              { key: "toBranch", label: "إلى فرع" },
              { key: "user", label: "بواسطة" },
              { key: "transferDate", label: "التاريخ" },
              { key: "itemsCount", label: "المنتجات" },
              { key: "status", label: "الحالة" },
            ]}
            rows={transfers.map((t) => ({
              transferNumber: t.transferNumber,
              fromBranch: t.fromBranch?.name || "",
              toBranch: t.toBranch?.name || "",
              user: t.user?.name || "",
              transferDate: t.transferDate,
              itemsCount: t.items?.length || 0,
              status: t.status === "completed" ? "مكتمل" : "قيد التنفيذ",
            }))}
            dateKey="transferDate"
          />
          <button
            onClick={() => {
              if (branches.length < 2) {
                toast.error("يلزم وجود فرعين على الأقل لإتمام التحويل — أضف فرعاً من صفحة الفروع أولاً")
                return
              }
              setShowCreate(true)
            }}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> تحويل جديد
          </button>
        </div>
      </div>

      <div className="flat-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث برقم التحويل أو اسم الفرع..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
            className="w-full pr-10 pl-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          : transfers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد تحويلات مخزون</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["رقم التحويل", "من فرع", "إلى فرع", "بواسطة", "التاريخ", "المنتجات", "الحالة"].map(h => <th key={h} className="px-4 py-3 text-right font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => setViewing(t)}
                      className="border-t border-border hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-primary">{t.transferNumber}</td>
                      <td className="px-4 py-3">{t.fromBranch?.name}</td>
                      <td className="px-4 py-3">{t.toBranch?.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.user?.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(t.transferDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.items?.length || 0} منتج</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-lg text-xs font-medium", t.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
                          {t.status === "completed" ? "مكتمل" : "قيد التنفيذ"}
                        </span>
                      </td>
                    </tr>
                  ))}
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

      {showCreate && <CreateTransferDialog branches={branches} onClose={() => setShowCreate(false)} onSubmit={createMutation.mutate} submitting={createMutation.isPending} />}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">تفاصيل التحويل — {viewing.transferNumber}</h2>
              <button onClick={() => setViewing(null)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">من فرع:</span> <strong>{viewing.fromBranch?.name}</strong></div>
                <div><span className="text-muted-foreground">إلى فرع:</span> <strong>{viewing.toBranch?.name}</strong></div>
                <div><span className="text-muted-foreground">بواسطة:</span> <strong>{viewing.user?.name}</strong></div>
                <div><span className="text-muted-foreground">التاريخ:</span> <strong>{formatDate(viewing.transferDate)}</strong></div>
                <div>
                  <span className="text-muted-foreground">الحالة:</span>{" "}
                  <strong>{viewing.status === "completed" ? "مكتمل" : "قيد التنفيذ"}</strong>
                </div>
                <div><span className="text-muted-foreground">عدد المنتجات:</span> <strong>{viewing.items?.length || 0}</strong></div>
              </div>
              {viewing.notes && (
                <div>
                  <span className="text-muted-foreground">ملاحظات:</span>
                  <p className="mt-1 font-medium">{viewing.notes}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2">المنتجات المحوّلة</h3>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["المنتج", "SKU", "الكمية"].map(h => (
                        <th key={h} className="px-3 py-2 text-right font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.items || []).map(item => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-3 py-2">{item.product?.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.product?.sku}</td>
                        <td className="px-3 py-2 font-semibold">{item.quantity}</td>
                      </tr>
                    ))}
                    {(!viewing.items || viewing.items.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">لا توجد منتجات</td>
                      </tr>
                    )}
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

function CreateTransferDialog({ branches, onClose, onSubmit, submitting }: any) {
  const [fromBranchId, setFromBranchId] = useState("")
  const [toBranchId, setToBranchId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<TransferItem[]>([{ productId: 0, quantity: 1 }])
  const [searches, setSearches] = useState<string[]>([""])
  const [results, setResults] = useState<any[][]>([[]])

  const searchProduct = async (query: string, idx: number) => {
    if (query.length < 2) { const r = [...results]; r[idx] = []; setResults(r); return }
    const res = await api.get('/products', { params: { search: query, limit: 6 } })
    const r = [...results]; r[idx] = res.data.data || []; setResults(r)
  }

  const selectProduct = (idx: number, product: any) => {
    const ni = [...items]; ni[idx] = { ...ni[idx], productId: product.id, product }
    setItems(ni)
    const s = [...searches]; s[idx] = `${product.name} (مخزون: ${product.stockQuantity})`; setSearches(s)
    const r = [...results]; r[idx] = []; setResults(r)
  }

  const addItem = () => { setItems([...items, { productId: 0, quantity: 1 }]); setSearches([...searches, ""]); setResults([...results, []]) }
  const removeItem = (idx: number) => { setItems(items.filter((_, i) => i !== idx)); setSearches(searches.filter((_, i) => i !== idx)); setResults(results.filter((_, i) => i !== idx)) }

  const handleSubmit = () => {
    if (!fromBranchId || !toBranchId) return toast.error("اختر الفرع المصدر والوجهة")
    if (fromBranchId === toBranchId) return toast.error("الفرع المصدر والوجهة لا يمكن أن يكونا نفس الفرع")
    if (items.some(i => !i.productId || i.quantity <= 0)) return toast.error("تأكد من اختيار المنتجات وتحديد الكميات")
    onSubmit({ fromBranchId: parseInt(fromBranchId), toBranchId: parseInt(toBranchId), notes, items: items.map(i => ({ productId: i.productId, quantity: i.quantity })) })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">تحويل مخزون جديد</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">من فرع <span className="text-destructive">*</span></label>
              <select value={fromBranchId} onChange={e => setFromBranchId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
                <option value="">اختر الفرع المصدر</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">إلى فرع <span className="text-destructive">*</span></label>
              <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none">
                <option value="">اختر فرع الوجهة</option>
                {branches.filter((b: any) => String(b.id) !== fromBranchId).map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">المنتجات</label>
              <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> إضافة منتج</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <input
                      value={searches[idx]}
                      onChange={e => { const s = [...searches]; s[idx] = e.target.value; setSearches(s); searchProduct(e.target.value, idx) }}
                      placeholder="ابحث عن منتج..."
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                    />
                    {results[idx]?.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-10">
                        {results[idx].map(p => (
                          <button key={p.id} onClick={() => selectProduct(idx, p)} className="w-full text-right px-3 py-2 text-sm hover:bg-muted flex justify-between">
                            <span>{p.name}</span><span className="text-muted-foreground text-xs">مخزون: {p.stockQuantity}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">الكمية:</label>
                    <input type="number" min="1" value={item.quantity} onChange={e => { const ni = [...items]; ni[idx].quantity = parseInt(e.target.value) || 1; setItems(ni) }} className="w-16 px-2 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none text-center" />
                  </div>
                  {items.length > 1 && <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-100 rounded-lg"><X className="w-4 h-4 text-red-500" /></button>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">إلغاء</button>
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />} تنفيذ التحويل
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
