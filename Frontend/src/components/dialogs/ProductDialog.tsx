import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { productService, categoryService } from "@/services/api.service"

interface ProductDialogProps {
  isOpen: boolean
  onClose: () => void
  productId?: number
  mode: "create" | "edit"
}

interface ProductFormData {
  name: string
  nameEn?: string
  sku: string
  barcode?: string
  description?: string
  categoryId?: number
  costPrice: number
  sellingPrice: number
  minSellingPrice?: number
  unit: string
  stockQuantity: number
  minStockLevel: number
  maxStockLevel?: number
  trackInventory: boolean
  isActive: boolean
  weight?: number
  dimensions?: string
  taxRate: number
  isTaxable: boolean
  notes?: string
}

export default function ProductDialog({
  isOpen,
  onClose,
  productId,
  mode,
}: ProductDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    costPrice: 0,
    sellingPrice: 0,
    unit: "قطعة",
    stockQuantity: 0,
    minStockLevel: 10,
    trackInventory: true,
    isActive: true,
    taxRate: 0,
    isTaxable: true,
  })

  // Fetch categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAll(),
  })

  const categories = categoriesResponse?.data || []

  // Fetch product data if editing
  const { data: productResponse } = useQuery({
    queryKey: ["products", productId],
    queryFn: () => productService.getById(productId!),
    enabled: mode === "edit" && !!productId,
  })

  useEffect(() => {
    if (mode === "edit" && productResponse?.data) {
      const product = productResponse.data
      setFormData({
        name: product.name || "",
        nameEn: product.nameEn || "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        description: product.description || "",
        categoryId: product.categoryId,
        costPrice: parseFloat(product.costPrice) || 0,
        sellingPrice: parseFloat(product.sellingPrice) || 0,
        minSellingPrice: product.minSellingPrice ? parseFloat(product.minSellingPrice) : undefined,
        unit: product.unit || "قطعة",
        stockQuantity: product.stockQuantity || 0,
        minStockLevel: product.minStockLevel || 10,
        maxStockLevel: product.maxStockLevel || undefined,
        trackInventory: product.trackInventory !== false,
        isActive: product.isActive !== false,
        weight: product.weight || undefined,
        dimensions: product.dimensions || "",
        taxRate: parseFloat(product.taxRate) || 0,
        isTaxable: product.isTaxable !== false,
        notes: product.notes || "",
      })
    }
  }, [productResponse, mode])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: ProductFormData) => {
      if (mode === "create") {
        return productService.create(data)
      } else {
        return productService.update(productId!, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "إضافة منتج جديد" : "تعديل المنتج"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4">المعلومات الأساسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                اسم المنتج <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                الاسم بالإنجليزية
              </label>
              <input
                type="text"
                name="nameEn"
                value={formData.nameEn || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                رمز المنتج (SKU) <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                الباركود (اتركه فارغاً للتوليد التلقائي)
              </label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">التصنيف</label>
              <select
                name="categoryId"
                value={formData.categoryId || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- اختر التصنيف --</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الوحدة</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h3 className="text-lg font-semibold mb-4">الأسعار</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                سعر التكلفة <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                سعر البيع <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                أقل سعر للبيع
              </label>
              <input
                type="number"
                name="minSellingPrice"
                value={formData.minSellingPrice || ""}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Stock */}
        <div>
          <h3 className="text-lg font-semibold mb-4">المخزون</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                الكمية الحالية
              </label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                حد إعادة الطلب
              </label>
              <input
                type="number"
                name="minStockLevel"
                value={formData.minStockLevel}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                الحد الأقصى للمخزون
              </label>
              <input
                type="number"
                name="maxStockLevel"
                value={formData.maxStockLevel || ""}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">الوصف</label>
          <textarea
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Checkboxes */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="trackInventory"
              checked={formData.trackInventory}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span className="text-sm">تتبع المخزون</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span className="text-sm">نشط</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isTaxable"
              checked={formData.isTaxable}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span className="text-sm">خاضع للضريبة</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ</span>
              </>
            )}
          </button>
        </div>
      </form>
    </BaseDialog>
  )
}
