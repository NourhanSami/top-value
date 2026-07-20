import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  Filter,
  Grid3x3,
  List,
  Printer,
  MoreVertical,
  Edit,
  Trash2,
  Barcode,
  Package,
  X,
  Loader2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { ExportMenu } from "@/components/ui/ExportMenu"
import { cn, formatCurrency } from "@/lib/utils"
import { productService, categoryService, branchService } from "@/services/api.service"
import type { Product } from "@/types"
import toast from "react-hot-toast"

type ViewMode = "table" | "grid"
type StockFilter = "all" | "low" | "medium" | "available"

export default function Products() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [searchTerm, setSearchTerm] = useState("")
  const [stockFilter, setStockFilter] = useState<StockFilter>("all")
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [addForm, setAddForm] = useState({
    name: "", sku: "", barcode: "", sellingPrice: "", costPrice: "",
    stockQuantity: "0", minStockLevel: "5", unit: "قطعة", description: "", categoryId: ""
  })

  // Fetch products
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ["products", searchTerm, stockFilter, currentPage],
    queryFn: () => productService.getAll({
      search: searchTerm || undefined,
      stock_filter: stockFilter !== "all" ? stockFilter : undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  const { data: categoriesRes } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAll(),
  })

  const { data: branchesRes } = useQuery({
    queryKey: ["branches-list"],
    queryFn: () => branchService.getAll(),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["products", "statistics"],
    queryFn: () => productService.getStatistics(),
  })

  const products: any[] = productsResponse?.data || []
  const stats = statsResponse?.data
  const categories: any[] = categoriesRes?.data || []
  const mainBranchName = (branchesRes?.data || []).find((b: any) => b.isMain)?.name || "المخزن الرئيسي"

  // Normalize product data
  const normalizedProducts = products.map(p => ({
    ...p,
    price: p.sellingPrice || p.price || 0,
    stock: p.stockQuantity || p.stock || 0,
    cost_price: p.costPrice || p.cost_price || 0,
    reorder_level: p.minStockLevel || p.reorder_level || 10,
  }))

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })

  const addMutation = useMutation({
    mutationFn: (data: any) => editingProduct
      ? productService.update(editingProduct.id, data)
      : productService.create(data),
    onSuccess: () => {
      toast.success(editingProduct ? "تم تحديث المنتج" : "تم إضافة المنتج بنجاح")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setShowAddDialog(false)
      setEditingProduct(null)
      setAddForm({ name: "", sku: "", barcode: "", sellingPrice: "", costPrice: "", stockQuantity: "0", minStockLevel: "5", unit: "قطعة", description: "", categoryId: "" })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء حفظ المنتج")
    }
  })

  const openEdit = (product: any) => {
    setEditingProduct(product)
    setAddForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      sellingPrice: String(product.sellingPrice || product.price || ""),
      costPrice: String(product.costPrice || product.cost_price || ""),
      stockQuantity: String(product.stockQuantity || product.stock || 0),
      minStockLevel: String(product.minStockLevel || product.reorder_level || 5),
      unit: product.unit || "قطعة",
      description: product.description || "",
      categoryId: product.categoryId ? String(product.categoryId) : (product.category?.id ? String(product.category.id) : ""),
    })
    setShowAddDialog(true)
  }

  const handlePrintList = () => {
    const rows = filteredProducts.map(p =>
      `<tr>
        <td>${p.name}</td>
        <td>${p.barcode || p.sku || ""}</td>
        <td>${typeof p.category === "object" ? (p.category?.name || "غير مصنف") : (p.category || "غير مصنف")}</td>
        <td>${Number(p.price).toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>${mainBranchName}</td>
      </tr>`
    ).join("")
    const w = window.open("", "_blank")
    if (!w) return toast.error("اسمح بالنوافذ المنبثقة للطباعة")
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>قائمة المنتجات</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background:#f3f4f6}</style>
      </head><body><h2>قائمة المنتجات</h2><table><thead><tr><th>المنتج</th><th>الباركود</th><th>التصنيف</th><th>السعر</th><th>المخزون</th><th>المخزن</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  const printBarcode = (product: any) => {
    const code = product.barcode || product.sku
    if (!code) return toast.error("لا يوجد باركود لهذا المنتج")
    const w = window.open("", "_blank", "width=400,height=300")
    if (!w) return toast.error("اسمح بالنوافذ المنبثقة للطباعة")
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>باركود - ${product.name}</title>
      <style>body{font-family:monospace;text-align:center;padding:40px}h3{margin-bottom:8px}.code{font-size:28px;letter-spacing:4px;border:2px solid #000;display:inline-block;padding:12px 20px;margin-top:12px}</style>
      </head><body><h3>${product.name}</h3><div class="code">${code}</div><script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }

  // Calculate stats
  const totalProducts = stats?.total || normalizedProducts.length
  const availableProducts = stats?.available || normalizedProducts.filter(
    (p) => p.stock > p.reorder_level * 2
  ).length
  const mediumStock = stats?.medium || normalizedProducts.filter(
    (p) => p.stock > p.reorder_level && p.stock <= p.reorder_level * 2
  ).length
  const lowStock = stats?.low || normalizedProducts.filter((p) => p.stock <= p.reorder_level).length

  const getStockStatus = (product: Product) => {
    if (product.stock <= product.reorder_level) return "low"
    if (product.stock <= product.reorder_level * 2) return "medium"
    return "available"
  }

  const getExpiryStatus = (product: Product) => {
    if (!product.expiry_date) return null

    const now = new Date()
    const expiry = new Date(product.expiry_date)
    const production = product.production_date
      ? new Date(product.production_date)
      : null

    if (expiry < now) return "expired"

    if (production) {
      const totalDuration = expiry.getTime() - production.getTime()
      const elapsed = now.getTime() - production.getTime()
      const percentageElapsed = (elapsed / totalDuration) * 100

      if (percentageElapsed >= 75) return "near-expiry"
    }

    return null
  }

  const filteredProducts = normalizedProducts.filter((product) => {
    if (stockFilter === "all") return true
    const status = getStockStatus(product)
    return status === stockFilter
  })

  const handleDeleteProduct = async (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error("فشل حذف المنتج:", error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل المنتجات...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-foreground font-semibold mb-2">فشل تحميل المنتجات</p>
          <p className="text-sm text-muted-foreground mb-4">حدث خطأ أثناء تحميل قائمة المنتجات</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المنتجات"
          value={totalProducts}
          icon={Grid3x3}
          variant="primary"
        />
        <StatCard
          title="إجمالي الكمية بالمخزون"
          value={Number(stats?.totalStockQuantity ?? stats?.total_stock_quantity ?? 0)}
          icon={Package}
          variant="info"
          subtitle="مجموع وحدات الأصناف"
        />
        <StatCard
          title="إجمالي المبيعات"
          value={formatCurrency(Number(stats?.totalSalesAmount ?? stats?.total_sales_amount ?? 0))}
          icon={Package}
          variant="success"
          subtitle={`${Number(stats?.totalSalesQuantity ?? stats?.total_sales_quantity ?? 0)} وحدة مباعة`}
        />
        <StatCard
          title="قيمة المخزون"
          value={formatCurrency(Number(stats?.totalValue ?? stats?.total_value ?? 0))}
          icon={Package}
          variant="warning"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="منتجات متوفرة"
          value={availableProducts}
          icon={Grid3x3}
          variant="success"
        />
        <StatCard
          title="مخزون متوسط"
          value={mediumStock}
          icon={Grid3x3}
          variant="warning"
        />
        <StatCard
          title="مخزون منخفض"
          value={lowStock}
          icon={Grid3x3}
          variant="destructive"
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
                placeholder="البحث في المنتجات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "table"
                  ? "bg-card text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-card text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className="flex items-center gap-2 px-4 h-10 bg-card border border-border rounded-xl hover:bg-muted transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">تصفية</span>
            </button>

            {showFilterPopover && (
              <div className="absolute left-0 top-full mt-2 w-64 flat-card p-4 z-10 shadow-flat-lg">
                <h3 className="font-semibold mb-3">حالة المخزون</h3>
                <div className="space-y-2">
                  <FilterCheckbox
                    label="الكل"
                    checked={stockFilter === "all"}
                    onChange={() => { setStockFilter("all"); setShowFilterPopover(false) }}
                  />
                  <FilterCheckbox
                    label="منخفض"
                    checked={stockFilter === "low"}
                    onChange={() => { setStockFilter("low"); setShowFilterPopover(false) }}
                    color="destructive"
                  />
                  <FilterCheckbox
                    label="متوسط"
                    checked={stockFilter === "medium"}
                    onChange={() => { setStockFilter("medium"); setShowFilterPopover(false) }}
                    color="warning"
                  />
                  <FilterCheckbox
                    label="متوفر"
                    checked={stockFilter === "available"}
                    onChange={() => { setStockFilter("available"); setShowFilterPopover(false) }}
                    color="success"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Print */}
          <ExportMenu
            filename={`منتجات-${new Date().toISOString().slice(0, 10)}`}
            title="المنتجات"
            columns={[
              { key: "name", label: "المنتج" },
              { key: "sku", label: "SKU" },
              { key: "barcode", label: "الباركود" },
              { key: "category", label: "التصنيف" },
              { key: "price", label: "سعر البيع" },
              { key: "costPrice", label: "سعر التكلفة" },
              { key: "stock", label: "المخزون" },
              { key: "unit", label: "الوحدة" },
              { key: "createdAt", label: "تاريخ الإضافة" },
            ]}
            rows={filteredProducts.map((p) => ({
              name: p.name,
              sku: p.sku || "",
              barcode: p.barcode || "",
              category: typeof p.category === "object" ? (p.category?.name || "غير مصنف") : (p.category || "غير مصنف"),
              price: Number(p.price || 0),
              costPrice: Number(p.cost_price || p.costPrice || 0),
              stock: Number(p.stock || 0),
              unit: p.unit || "",
              createdAt: p.createdAt || p.created_at || "",
            }))}
            dateKey="createdAt"
          />
          <button
            onClick={handlePrintList}
            className="flex items-center gap-2 px-4 h-10 bg-card border border-border rounded-xl hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="text-sm font-medium">طباعة</span>
          </button>

          {/* Add Product */}
          <button
            onClick={() => {
              setEditingProduct(null)
              setAddForm({ name: "", sku: "", barcode: "", sellingPrice: "", costPrice: "", stockQuantity: "0", minStockLevel: "5", unit: "قطعة", description: "", categoryId: "" })
              setShowAddDialog(true)
            }}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة منتج</span>
          </button>
        </div>
      </div>

      {/* Products Table/Grid */}
      {viewMode === "table" ? (
        <div className="flat-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المنتج
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الباركود
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    التصنيف
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    السعر
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المخزون
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    المخزن
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product)
                  const expiryStatus = getExpiryStatus(product)

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {product.name}
                          </p>
                          {expiryStatus && (
                            <span
                              className={cn(
                                "inline-block mt-1 text-xs px-2 py-0.5 rounded-md",
                                expiryStatus === "expired"
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-warning text-warning-foreground"
                              )}
                            >
                              {expiryStatus === "expired"
                                ? "منتهي الصلاحية"
                                : "قرب انتهاء الصلاحية"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground font-mono">
                            {product.barcode || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-foreground">
                          {typeof product.category === 'object' 
                            ? (product.category?.name || "غير مصنف")
                            : (product.category || "غير مصنف")}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(product.price)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">
                            {product.stock}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-md",
                              stockStatus === "low" &&
                                "bg-destructive/10 text-destructive",
                              stockStatus === "medium" &&
                                "bg-warning-light text-warning",
                              stockStatus === "available" &&
                                "bg-success-light text-success"
                            )}
                          >
                            {stockStatus === "low"
                              ? "منخفض"
                              : stockStatus === "medium"
                              ? "متوسط"
                              : "متوفر"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-muted-foreground">
                          {mainBranchName}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <ProductActionsMenu
                          productId={product.id}
                          onEdit={() => openEdit(product)}
                          onPrintBarcode={() => printBarcode(product)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product)
            const expiryStatus = getExpiryStatus(product)

            return (
              <div key={product.id} className="flat-card hover-lift p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {product.name}
                    </h3>
                    {expiryStatus && (
                      <span
                        className={cn(
                          "inline-block text-xs px-2 py-0.5 rounded-md",
                          expiryStatus === "expired"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-warning text-warning-foreground"
                        )}
                      >
                        {expiryStatus === "expired"
                          ? "منتهي"
                          : "قرب انتهاء"}
                      </span>
                    )}
                  </div>
                  <ProductActionsMenu
                    productId={product.id}
                    onEdit={() => openEdit(product)}
                    onPrintBarcode={() => printBarcode(product)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      السعر
                    </span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      المخزون
                    </span>
                    <span
                      className={cn(
                        "text-sm px-2 py-0.5 rounded-md font-medium",
                        stockStatus === "low" &&
                          "bg-destructive/10 text-destructive",
                        stockStatus === "medium" &&
                          "bg-warning-light text-warning",
                        stockStatus === "available" &&
                          "bg-success-light text-success"
                      )}
                    >
                      {product.stock}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {mainBranchName}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Product Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editingProduct ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
              <button onClick={() => setShowAddDialog(false)} className="p-2 hover:bg-muted rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">اسم المنتج <span className="text-destructive">*</span></label>
                  <input type="text" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="اسم المنتج" className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">رمز المنتج (SKU)</label>
                  <input type="text" value={addForm.sku} onChange={e => setAddForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="SKU-001" className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">الباركود</label>
                  <input type="text" value={addForm.barcode} onChange={e => setAddForm(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="1234567890" className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">سعر البيع <span className="text-destructive">*</span></label>
                  <input type="number" min="0" step="0.01" value={addForm.sellingPrice} onChange={e => setAddForm(f => ({ ...f, sellingPrice: e.target.value }))}
                    placeholder="0.00" className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">سعر التكلفة</label>
                  <input type="number" min="0" step="0.01" value={addForm.costPrice} onChange={e => setAddForm(f => ({ ...f, costPrice: e.target.value }))}
                    placeholder="0.00" className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">الكمية الابتدائية</label>
                  <input type="number" min="0" value={addForm.stockQuantity} onChange={e => setAddForm(f => ({ ...f, stockQuantity: e.target.value }))}
                    placeholder="0" className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">حد التنبيه المنخفض</label>
                  <input type="number" min="0" value={addForm.minStockLevel} onChange={e => setAddForm(f => ({ ...f, minStockLevel: e.target.value }))}
                    placeholder="5" className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">التصنيف</label>
                  <select value={addForm.categoryId} onChange={e => setAddForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none bg-background">
                    <option value="">بدون تصنيف</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">وحدة القياس</label>
                  <select value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none bg-background">
                    <option>قطعة</option><option>كيلو</option><option>لتر</option><option>متر</option><option>علبة</option><option>كرتون</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">الوصف</label>
                  <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} placeholder="وصف المنتج (اختياري)"
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowAddDialog(false); setEditingProduct(null) }} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">إلغاء</button>
                <button
                  disabled={!addForm.name || !addForm.sellingPrice || addMutation.isPending}
                  onClick={() => addMutation.mutate({
                    name: addForm.name,
                    sku: addForm.sku || `SKU-${Date.now()}`,
                    barcode: addForm.barcode || undefined,
                    sellingPrice: parseFloat(addForm.sellingPrice), costPrice: parseFloat(addForm.costPrice) || 0,
                    stockQuantity: parseInt(addForm.stockQuantity) || 0, minStockLevel: parseInt(addForm.minStockLevel) || 5,
                    unit: addForm.unit, description: addForm.description || undefined,
                    categoryId: addForm.categoryId ? parseInt(addForm.categoryId) : undefined,
                  })}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60"
                >
                  {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? "حفظ التعديلات" : "حفظ المنتج"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface FilterCheckboxProps {
  label: string
  checked: boolean
  onChange: () => void
  color?: "destructive" | "warning" | "success"
}

function FilterCheckbox({
  label,
  checked,
  onChange,
  color,
}: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-border"
      />
      <span
        className={cn(
          "text-sm flex-1",
          checked ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      {color && (
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            color === "destructive" && "bg-destructive",
            color === "warning" && "bg-warning",
            color === "success" && "bg-success"
          )}
        />
      )}
    </label>
  )
}

function ProductActionsMenu({
  productId,
  onEdit,
  onPrintBarcode,
}: {
  productId: number
  onEdit: () => void
  onPrintBarcode: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      toast.success("تم حذف المنتج")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setIsOpen(false)
    },
    onError: () => toast.error("فشل حذف المنتج"),
  })

  const handleDelete = async () => {
    if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      await deleteMutation.mutateAsync(productId)
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
            <button
              onClick={() => { onEdit(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              تعديل
            </button>
            <button
              onClick={() => { onPrintBarcode(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Barcode className="w-4 h-4" />
              طباعة باركود
            </button>
            <button 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
