import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { customerService } from "@/services/api.service"

interface CustomerDialogProps {
  isOpen: boolean
  onClose: () => void
  customerId?: number
  mode: "create" | "edit"
}

interface CustomerFormData {
  name: string
  phone: string
  email?: string
  address?: string
  balance?: number
  creditLimit?: number
  notes?: string
  type?: string
  companyName?: string
  taxNumber?: string
}

export default function CustomerDialog({
  isOpen,
  onClose,
  customerId,
  mode,
}: CustomerDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    phone: "",
    balance: 0,
    creditLimit: 0,
    type: "individual",
    companyName: "",
    taxNumber: "",
  })

  // Fetch customer data if editing
  const { data: customerResponse } = useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => customerService.getById(customerId!),
    enabled: mode === "edit" && !!customerId,
  })

  useEffect(() => {
    if (mode === "edit" && customerResponse?.data) {
      const customer = customerResponse.data
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        balance: customer.balance || 0,
        creditLimit: customer.creditLimit || 0,
        notes: customer.notes || "",
        type: customer.type || "individual",
        companyName: customer.companyName || "",
        taxNumber: customer.taxNumber || "",
      })
    }
  }, [customerResponse, mode])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: CustomerFormData) => {
      if (mode === "create") {
        return customerService.create(data)
      } else {
        return customerService.update(customerId!, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
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
    const { name, value, type } = e.target
    
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "إضافة عميل جديد" : "تعديل العميل"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              اسم العميل <span className="text-destructive">*</span>
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
            <label className="block text-sm font-medium mb-2">نوع العميل</label>
            <select
              name="type"
              value={formData.type || "individual"}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="individual">فرد</option>
              <option value="company">شركة (B2B)</option>
            </select>
          </div>

          {formData.type === "company" && (
            <div>
              <label className="block text-sm font-medium mb-2">اسم المنشأة</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">الرقم الضريبي</label>
            <input
              type="text"
              name="taxNumber"
              value={formData.taxNumber || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  taxNumber: e.target.value.replace(/\D/g, "").slice(0, 15),
                }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              placeholder="10–15 رقم"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              حد الائتمان
            </label>
            <input
              type="number"
              name="creditLimit"
              value={formData.creditLimit}
              onChange={handleChange}
              min="0"
              step="0.01"
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
