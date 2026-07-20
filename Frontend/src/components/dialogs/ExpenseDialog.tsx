import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { expenseService, branchService } from "@/services/api.service"
import toast from "react-hot-toast"

interface ExpenseDialogProps {
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  expense?: any
  expenseId?: number
  mode?: "create" | "edit"
}

export default function ExpenseDialog({
  open,
  isOpen,
  onClose,
  expense,
  expenseId,
  mode: modeProp,
}: ExpenseDialogProps) {
  const dialogOpen = open ?? isOpen ?? false
  const mode = modeProp || (expense || expenseId ? "edit" : "create")
  const editId = expense?.id || expenseId

  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    expenseCategoryId: "",
    branchId: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  })

  const { data: categoriesRes } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseService.getCategories(),
    enabled: dialogOpen,
  })
  const { data: branchesRes } = useQuery({
    queryKey: ["branches-list"],
    queryFn: () => branchService.getAll(),
    enabled: dialogOpen,
  })

  const categories: any[] = categoriesRes?.data || []
  const branches: any[] = branchesRes?.data || []

  useEffect(() => {
    if (!dialogOpen) return
    if (mode === "edit" && expense) {
      setFormData({
        title: expense.title || "",
        description: expense.description || "",
        amount: String(expense.amount ?? ""),
        expenseCategoryId: String(expense.expenseCategoryId || expense.category?.id || ""),
        branchId: String(expense.branchId || expense.branch?.id || ""),
        expenseDate: expense.expenseDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        paymentMethod: expense.paymentMethod === "bank_transfer" ? "transfer" : (expense.paymentMethod || "cash"),
        notes: expense.notes || "",
      })
    } else if (mode === "create") {
      setFormData({
        title: "",
        description: "",
        amount: "",
        expenseCategoryId: categories[0] ? String(categories[0].id) : "",
        branchId: branches[0] ? String(branches[0].id) : "",
        expenseDate: new Date().toISOString().split("T")[0],
        paymentMethod: "cash",
        notes: "",
      })
    }
  }, [dialogOpen, mode, expense, categories.length, branches.length])

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      mode === "create" ? expenseService.create(data) : expenseService.update(editId!, data),
    onSuccess: () => {
      toast.success(mode === "create" ? "تم إضافة المصروف" : "تم تحديث المصروف")
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحفظ"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return toast.error("أدخل عنوان المصروف")
    if (!formData.expenseCategoryId) return toast.error("اختر الفئة")
    if (!formData.branchId) return toast.error("اختر الفرع")
    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) return toast.error("أدخل مبلغاً صحيحاً")

    saveMutation.mutate({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      amount,
      expenseCategoryId: parseInt(formData.expenseCategoryId),
      branchId: parseInt(formData.branchId),
      expenseDate: new Date(formData.expenseDate + "T12:00:00").toISOString(),
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || undefined,
    })
  }

  return (
    <BaseDialog
      isOpen={dialogOpen}
      onClose={onClose}
      title={mode === "create" ? "إضافة مصروف جديد" : "تعديل المصروف"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">عنوان المصروف *</label>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">الوصف</label>
          <input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">المبلغ *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">الفئة *</label>
            <select
              value={formData.expenseCategoryId}
              onChange={(e) => setFormData({ ...formData, expenseCategoryId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
              required
            >
              <option value="">اختر الفئة</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">الفرع *</label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
              required
            >
              <option value="">اختر الفرع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">التاريخ *</label>
            <input
              type="date"
              value={formData.expenseDate}
              onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">طريقة الدفع</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
            >
              <option value="cash">نقدي</option>
              <option value="card">بطاقة</option>
              <option value="transfer">تحويل</option>
              <option value="check">شيك</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">ملاحظات</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </button>
        </div>
      </form>
    </BaseDialog>
  )
}
