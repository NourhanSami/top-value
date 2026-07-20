import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plus, Loader2, Truck, CheckCircle2, AlertTriangle, X, Package,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { ExportMenu } from "@/components/ui/ExportMenu"
import api from "@/lib/api"
import toast from "react-hot-toast"
import { productService, branchService, userService } from "@/services/api.service"

const routeApi = {
  getAll: (params?: any) => api.get("/driver-routes", { params }).then((r) => r.data),
  getById: (id: number) => api.get(`/driver-routes/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/driver-routes", data).then((r) => r.data),
  dispatch: (id: number) => api.post(`/driver-routes/${id}/dispatch`).then((r) => r.data),
  reconcile: (id: number, data: any) => api.post(`/driver-routes/${id}/reconcile`, data).then((r) => r.data),
  close: (id: number) => api.post(`/driver-routes/${id}/close`).then((r) => r.data),
  delete: (id: number) => api.delete(`/driver-routes/${id}`).then((r) => r.data),
}

const statusLabel: Record<string, string> = {
  draft: "مسودة",
  dispatched: "تم الصرف",
  reconciled: "تم الفيصل",
  closed: "مغلق",
}

const statusClass: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  dispatched: "bg-info/15 text-info",
  reconciled: "bg-warning/15 text-warning",
  closed: "bg-success/15 text-success",
}

type DraftItem = { productId: string; warehouseQty: string; productName?: string }

export default function DriverRoutesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [driverQtyMap, setDriverQtyMap] = useState<Record<number, string>>({})

  const [form, setForm] = useState({
    driverId: "",
    branchId: "",
    periodType: "daily" as "daily" | "weekly",
    routeDate: new Date().toISOString().slice(0, 10),
    weekEndDate: "",
    notes: "",
  })
  const [items, setItems] = useState<DraftItem[]>([{ productId: "", warehouseQty: "1" }])

  const { data: listRes, isLoading } = useQuery({
    queryKey: ["driver-routes", statusFilter],
    queryFn: () => routeApi.getAll({ status: statusFilter !== "all" ? statusFilter : undefined, limit: 50 }),
  })
  const { data: detailRes, isLoading: detailLoading } = useQuery({
    queryKey: ["driver-route", selectedId],
    queryFn: () => routeApi.getById(selectedId!),
    enabled: !!selectedId,
  })
  const { data: usersRes } = useQuery({
    queryKey: ["users-drivers"],
    queryFn: () => userService.getAll({ limit: 100 }),
  })
  const { data: branchesRes } = useQuery({
    queryKey: ["branches-list"],
    queryFn: () => branchService.getAll(),
  })
  const { data: productsRes } = useQuery({
    queryKey: ["products-for-routes"],
    queryFn: () => productService.getAll({ limit: 200 }),
  })

  const routes = listRes?.data || []
  const detail = detailRes?.data
  const users: any[] = usersRes?.data || []
  const branches: any[] = branchesRes?.data || []
  const products: any[] = productsRes?.data || []

  const createMutation = useMutation({
    mutationFn: routeApi.create,
    onSuccess: () => {
      toast.success("تم إنشاء خط السير")
      queryClient.invalidateQueries({ queryKey: ["driver-routes"] })
      setShowCreate(false)
      setItems([{ productId: "", warehouseQty: "1" }])
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الإنشاء"),
  })

  const dispatchMutation = useMutation({
    mutationFn: routeApi.dispatch,
    onSuccess: () => {
      toast.success("تم صرف الكميات من المخزن")
      queryClient.invalidateQueries({ queryKey: ["driver-routes"] })
      queryClient.invalidateQueries({ queryKey: ["driver-route"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الصرف"),
  })

  const reconcileMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => routeApi.reconcile(id, data),
    onSuccess: (res) => {
      toast.success(res.message || "تم حفظ الفيصل")
      queryClient.invalidateQueries({ queryKey: ["driver-routes"] })
      queryClient.invalidateQueries({ queryKey: ["driver-route"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الفيصل"),
  })

  const closeMutation = useMutation({
    mutationFn: routeApi.close,
    onSuccess: () => {
      toast.success("تم إغلاق خط السير")
      queryClient.invalidateQueries({ queryKey: ["driver-routes"] })
      queryClient.invalidateQueries({ queryKey: ["driver-route"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الإغلاق"),
  })

  const deleteMutation = useMutation({
    mutationFn: routeApi.delete,
    onSuccess: () => {
      toast.success("تم الحذف")
      setSelectedId(null)
      queryClient.invalidateQueries({ queryKey: ["driver-routes"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحذف"),
  })

  const openDetail = (id: number) => {
    setSelectedId(id)
    setDriverQtyMap({})
  }

  const initDriverQtys = useMemo(() => {
    if (!detail?.items) return
    const map: Record<number, string> = {}
    for (const item of detail.items) {
      map[item.id] = item.driverQty != null ? String(item.driverQty) : String(item.warehouseQty)
    }
    return map
  }, [detail?.id, detail?.items])

  const effectiveQtyMap = Object.keys(driverQtyMap).length ? driverQtyMap : (initDriverQtys || {})

  const submitCreate = () => {
    if (!form.driverId || !form.branchId) return toast.error("اختر السائق والمخزن")
    const cleanItems = items
      .filter((i) => i.productId && parseInt(i.warehouseQty) > 0)
      .map((i) => ({ productId: parseInt(i.productId), warehouseQty: parseInt(i.warehouseQty) }))
    if (!cleanItems.length) return toast.error("أضف صنفاً واحداً على الأقل")

    createMutation.mutate({
      driverId: parseInt(form.driverId),
      branchId: parseInt(form.branchId),
      periodType: form.periodType,
      routeDate: new Date(form.routeDate).toISOString(),
      weekEndDate: form.periodType === "weekly" && form.weekEndDate
        ? new Date(form.weekEndDate).toISOString()
        : undefined,
      notes: form.notes || undefined,
      items: cleanItems,
    })
  }

  const submitReconcile = () => {
    if (!detail) return
    const payload = {
      items: detail.items.map((item: any) => ({
        itemId: item.id,
        driverQty: parseInt(effectiveQtyMap[item.id] ?? String(item.warehouseQty)) || 0,
      })),
    }
    reconcileMutation.mutate({ id: detail.id, data: payload })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">خط سير السائق / الفيصل</h1>
          <p className="text-sm text-muted-foreground mt-1">
            صرف كميات من المخزن للسائق ومطابقتها مع ما استلمه (فيصل يومي أو أسبوعي)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            filename={`خطوط-سير-${new Date().toISOString().slice(0, 10)}`}
            title="خطوط سير السائق"
            columns={[
              { key: "routeNumber", label: "رقم الخط" },
              { key: "driver", label: "السائق" },
              { key: "branch", label: "المخزن" },
              { key: "period", label: "الفترة" },
              { key: "routeDate", label: "التاريخ" },
              { key: "status", label: "الحالة" },
              { key: "totalWarehouse", label: "المخزن" },
              { key: "totalDriver", label: "السائق" },
              { key: "totalVariance", label: "الفرق" },
            ]}
            rows={routes.map((r: any) => ({
              routeNumber: r.routeNumber,
              driver: r.driver?.name || "",
              branch: r.branch?.name || "",
              period: r.periodType === "weekly" ? "أسبوعي" : "يومي",
              routeDate: r.routeDate,
              status: statusLabel[r.status] || r.status,
              totalWarehouse: Number(r.summary?.totalWarehouse || 0),
              totalDriver: Number(r.summary?.totalDriver || 0),
              totalVariance: Number(r.summary?.totalVariance || 0),
            }))}
            dateKey="routeDate"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" /> خط سير جديد
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "dispatched", "reconciled", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-sm border",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
            )}
          >
            {s === "all" ? "الكل" : statusLabel[s]}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : routes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            لا توجد خطوط سير بعد
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["رقم الخط", "السائق", "المخزن", "الفترة", "الحالة", "المخزن/السائق", "الفرق", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-right font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.map((r: any) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-3 font-mono text-primary">{r.routeNumber}</td>
                  <td className="px-3 py-3">{r.driver?.name}</td>
                  <td className="px-3 py-3">{r.branch?.name}</td>
                  <td className="px-3 py-3">
                    {r.periodType === "weekly" ? "أسبوعي" : "يومي"} — {formatDate(r.routeDate)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs", statusClass[r.status])}>
                      {statusLabel[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {r.summary?.totalWarehouse ?? 0} / {r.summary?.totalDriver ?? 0}
                  </td>
                  <td className={cn("px-3 py-3 font-medium", (r.summary?.totalVariance || 0) !== 0 ? "text-destructive" : "text-success")}>
                    {r.status === "draft" || r.status === "dispatched" ? "—" : (r.summary?.totalVariance ?? 0)}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => openDetail(r.id)} className="text-primary text-xs hover:underline">تفاصيل / فيصل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">إنشاء خط سير</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">السائق / الموظف *</label>
                <select
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                  className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                >
                  <option value="">اختر</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">المخزن *</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                >
                  <option value="">اختر</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">نوع الفترة</label>
                <select
                  value={form.periodType}
                  onChange={(e) => setForm({ ...form, periodType: e.target.value as "daily" | "weekly" })}
                  className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                >
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">تاريخ البداية</label>
                <input
                  type="date"
                  value={form.routeDate}
                  onChange={(e) => setForm({ ...form, routeDate: e.target.value })}
                  className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                />
              </div>
              {form.periodType === "weekly" && (
                <div>
                  <label className="text-xs text-muted-foreground">نهاية الأسبوع</label>
                  <input
                    type="date"
                    value={form.weekEndDate}
                    onChange={(e) => setForm({ ...form, weekEndDate: e.target.value })}
                    className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">الأصناف الخارجة من المخزن</h3>
                <button
                  type="button"
                  onClick={() => setItems([...items, { productId: "", warehouseQty: "1" }])}
                  className="text-xs px-2 py-1 border rounded-lg hover:bg-muted"
                >
                  + صنف
                </button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx].productId = e.target.value
                      setItems(next)
                    }}
                    className="col-span-8 h-10 px-2 border rounded-xl bg-background text-sm"
                  >
                    <option value="">اختر منتج</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (متوفر: {p.stockQuantity ?? p.stock ?? 0})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.warehouseQty}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx].warehouseQty = e.target.value
                      setItems(next)
                    }}
                    className="col-span-3 h-10 px-2 border rounded-xl bg-background text-sm text-center"
                    placeholder="كمية"
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="col-span-1 p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="ملاحظات"
              rows={2}
              className="w-full px-3 py-2 border rounded-xl bg-background text-sm resize-none"
            />

            <button
              disabled={createMutation.isPending}
              onClick={submitCreate}
              className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
          </div>
        </div>
      )}

      {/* Detail / Faisal dialog */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedId(null)} />
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card rounded-2xl border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="text-lg font-bold">تفاصيل خط السير / الفيصل</h2>
                {detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {detail.routeNumber} — {detail.driver?.name} — {statusLabel[detail.status]}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="text-muted-foreground">المخزن</p>
                    <p className="font-medium">{detail.branch?.name}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="text-muted-foreground">الفترة</p>
                    <p className="font-medium">{detail.periodType === "weekly" ? "أسبوعي" : "يومي"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="text-muted-foreground">كمية المخزن</p>
                    <p className="font-bold">{detail.summary?.totalWarehouse}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="text-muted-foreground">كمية السائق</p>
                    <p className="font-bold">{detail.summary?.totalDriver}</p>
                  </div>
                </div>

                {detail.summary && detail.status !== "draft" && detail.status !== "dispatched" && (
                  <div className={cn(
                    "rounded-xl p-3 text-sm flex items-center gap-2 border",
                    detail.summary.allMatched
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  )}>
                    {detail.summary.allMatched ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {detail.summary.allMatched
                      ? "الفيصل مطابق — لا يوجد فرق"
                      : `يوجد اختلاف في ${detail.summary.mismatchCount} صنف (صافي الفرق: ${detail.summary.totalVariance})`}
                  </div>
                )}

                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["المنتج", "خرج من المخزن", "استلم السائق", "الفرق", "المطابقة"].map((h) => (
                          <th key={h} className="px-3 py-2 text-right font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item: any) => {
                        const dq = parseInt(effectiveQtyMap[item.id] ?? "") || 0
                        const variance = item.driverQty != null
                          ? item.variance
                          : (detail.status === "dispatched" || detail.status === "reconciled"
                            ? item.warehouseQty - dq
                            : null)
                        return (
                          <tr key={item.id} className="border-t border-border">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <span>{item.product?.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-medium">{item.warehouseQty}</td>
                            <td className="px-3 py-2">
                              {(detail.status === "dispatched" || detail.status === "reconciled") ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={effectiveQtyMap[item.id] ?? ""}
                                  onChange={(e) => setDriverQtyMap({ ...effectiveQtyMap, [item.id]: e.target.value })}
                                  className="w-20 h-8 px-2 border rounded-lg text-center bg-background"
                                />
                              ) : (
                                item.driverQty ?? "—"
                              )}
                            </td>
                            <td className={cn("px-3 py-2 font-medium", variance != null && variance !== 0 ? "text-destructive" : "text-success")}>
                              {variance == null ? "—" : variance}
                            </td>
                            <td className="px-3 py-2">
                              {item.driverQty == null && detail.status !== "dispatched" ? "—" : (
                                (variance === 0 || item.isMatched)
                                  ? <span className="text-success text-xs">مطابق</span>
                                  : <span className="text-destructive text-xs">غير مطابق</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {detail.status === "draft" && (
                    <>
                      <button
                        disabled={dispatchMutation.isPending}
                        onClick={() => dispatchMutation.mutate(detail.id)}
                        className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm disabled:opacity-50"
                      >
                        صرف من المخزن للسائق
                      </button>
                      <button
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm("حذف المسودة؟")) deleteMutation.mutate(detail.id)
                        }}
                        className="h-10 px-4 border border-destructive text-destructive rounded-xl text-sm"
                      >
                        حذف
                      </button>
                    </>
                  )}
                  {(detail.status === "dispatched" || detail.status === "reconciled") && (
                    <button
                      disabled={reconcileMutation.isPending}
                      onClick={submitReconcile}
                      className="h-10 px-4 bg-warning text-warning-foreground rounded-xl text-sm disabled:opacity-50"
                    >
                      حفظ الفيصل (مطابقة الكميات)
                    </button>
                  )}
                  {detail.status === "reconciled" && (
                    <button
                      disabled={closeMutation.isPending}
                      onClick={() => closeMutation.mutate(detail.id)}
                      className="h-10 px-4 bg-success text-success-foreground rounded-xl text-sm disabled:opacity-50"
                    >
                      إغلاق خط السير
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
