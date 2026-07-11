import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { branchService } from "@/services/api.service"

interface BranchDialogProps {
  isOpen: boolean
  onClose: () => void
  branchId?: number
  mode: "create" | "edit"
}

interface BranchFormData {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  isActive: boolean
}

export default function BranchDialog({
  isOpen,
  onClose,
  branchId,
  mode,
}: BranchDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<BranchFormData>({
    name: "",
    code: "",
    isActive: true,
  })

  const { data: branchResponse } = useQuery({
    queryKey: ["branches", branchId],
    queryFn: () => branchService.getById(branchId!),
    enabled: mode === "edit" && !!branchId,
  })

  useEffect(() => {
    if (mode === "edit" && branchResponse?.data) {
      const branch = branchResponse.data
      setFormData({
        name: branch.name || "",
        code: branch.code || "",
        address: branch.address || "",
        phone: branch.phone || "",
        email: branch.email || "",
        isActive: branch.isActive !== false,
      })
    }
  }, [branchResponse, mode])

  const saveMutation = useMutation({
    mutationFn: (data: BranchFormData) => {
      if (mode === "create") {
        return branchService.create(data)
      } else {
        return branchService.update(branchId!, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "إضافة فرع جديد" : "تعديل الفرع"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              اسم الفرع <span className="text-destructive">*</span>
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
              كود الفرع <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
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

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="w-4 h-4"
          />
          <span className="text-sm">فرع نشط</span>
        </label>

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
