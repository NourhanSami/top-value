import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { supplierService } from "@/services/api.service"

interface SupplierDialogProps {
  isOpen: boolean
  onClose: () => void
  supplierId?: number
  mode: "create" | "edit"
}

interface SupplierFormData {
  name: string
  phone: string
  email?: string
  address?: string
  taxNumber?: string
  notes?: string
}

export default function SupplierDialog({
  isOpen,
  onClose,
  supplierId,
  mode,
}: SupplierDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    phone: "",
  })

  // Fetch supplier data if editing
  const { data: supplierResponse } = useQuery({
    queryKey: ["suppliers", supplierId],
    queryFn: () => supplierService.getById(supplierId!),
    enabled: mode === "edit" && !!supplierId,
  })

  useEffect(() => {
    if (mode === "edit" && supplierResponse?.data) {
      const supplier = supplierResponse.data
      setFormData({
        name: supplier.name || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        taxNumber: supplier.taxNumber || "",
        notes: supplier.notes || "",
      })
    }
  }, [supplierResponse, mode])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: SupplierFormData) => {
      if (mode === "create") {
        return supplierService.create(data)
      } else {
        return supplierService.update(supplierId!, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "إضافة مورد جديد" : "تعديل المورد"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              اسم المورد <span className="text-destructive">*</span>
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
              رقم الهاتف <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              الرقم الضريبي
            </label>
            <input
              type="text"
              name="taxNumber"
              value={formData.taxNumber || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">العنوان</label>
          <input
            type="text"
            name="address"
            value={formData.address || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">ملاحظات</label>
          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
