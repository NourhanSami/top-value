import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { expenseService } from "@/services/api.service"

interface ExpenseDialogProps {
  isOpen: boolean
  onClose: () => void
  expenseId?: number
  mode: "create" | "edit"
}

const EXPENSE_CATEGORIES = [
  { value: "general", label: "عامة" },
  { value: "vehicles", label: "سيارات" },
  { value: "rent", label: "إيجار" },
  { value: "services", label: "خدمات" },
  { value: "salaries", label: "رواتب" },
  { value: "other", label: "أخرى" },
]

interface ExpenseFormData {
  title: string
  amount: number
  category: string
  expenseDate: string
  notes?: string
}

export default function ExpenseDialog({
  isOpen,
  onClose,
  expenseId,
  mode,
}: ExpenseDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: "",
    amount: 0,
    category: "general",
    expenseDate: new Date().toISOString().split('T')[0],
  })

  // Fetch expense data if editing
  const { data: expenseResponse } = useQuery({
    queryKey: ["expenses", expenseId],
    queryFn: () => expenseService.getById(expenseId!),
    enabled: mode === "edit" && !!expenseId,
  })

  useEffect(() => {
    if (mode === "edit" && expenseResponse?.data) {
      const expense = expenseResponse.data
      setFormData({
        title: expense.title || "",
        amount: expense.amount || 0,
        category: expense.category || "general",
        expenseDate: expense.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        notes: expense.notes || "",
      })
    }
  }, [expenseResponse, mode])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => {
      if (mode === "create") {
        return expenseService.create(data)
      } else {
        return expenseService.update(expenseId!, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
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
      title={mode === "create" ? "إضافة مصروف جديد" : "تعديل المصروف"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            عنوان المصروف <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              المبلغ <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              التصنيف <span className="text-destructive">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              التاريخ <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              name="expenseDate"
              value={formData.expenseDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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
