import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { expenseService } from "@/services/api.service"
import {
  Receipt, Search, Plus, Download, Edit2, Trash2, Calendar, TrendingUp, TrendingDown,
} from "lucide-react"
import { ExpenseDialog } from "@/components/dialogs"
import { formatCurrency } from "@/lib/utils"
import toast from "react-hot-toast"

const paymentLabel: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
  bank_transfer: "تحويل",
  check: "شيك",
}

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ["expenses", page, categoryFilter, searchTerm],
    queryFn: () =>
      expenseService.getAll({
        page,
        limit: 20,
        categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
        search: searchTerm || undefined,
      }),
  })

  const { data: categoriesRes } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseService.getCategories(),
  })

  const { data: todayStatsRes } = useQuery({
    queryKey: ["expenses-stats-today"],
    queryFn: () => expenseService.getStatistics({ period: "today" }),
  })

  const { data: monthStatsRes } = useQuery({
    queryKey: ["expenses-stats-month"],
    queryFn: () => expenseService.getStatistics({ period: "month" }),
  })

  const categories: any[] = categoriesRes?.data || []
  const todayStats = todayStatsRes?.data
  const monthStats = monthStatsRes?.data

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      toast.success("تم حذف المصروف بنجاح")
    },
    onError: () => toast.error("فشل حذف المصروف"),
  })

  const handleEdit = (expense: any) => {
    setSelectedExpense(expense)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المصروف؟")) {
      deleteMutation.mutate(id)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedExpense(null)
  }

  const handleExport = () => {
    const rows = expensesData?.data || []
    if (!rows.length) return toast.error("لا توجد بيانات للتصدير")
    const header = ["التاريخ", "العنوان", "الوصف", "الفئة", "الفرع", "المبلغ", "طريقة الدفع"]
    const csvRows = rows.map((e: any) => [
      e.expenseDate ? new Date(e.expenseDate).toLocaleDateString("ar-EG") : "",
      e.title || "",
      e.description || "",
      e.category?.name || "",
      e.branch?.name || "",
      Number(e.amount || 0).toFixed(2),
      paymentLabel[e.paymentMethod] || e.paymentMethod || "",
    ])
    const csv = "\uFEFF" + [header, ...csvRows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("تم تصدير الملف")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المصروفات</h1>
          <p className="text-muted-foreground mt-1">إدارة ومتابعة جميع المصروفات والنفقات</p>
        </div>
        <button
          onClick={() => { setSelectedExpense(null); setIsDialogOpen(true) }}
          className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مصروف</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">إجمالي المصروفات اليوم</span>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(Number(todayStats?.totalExpenses || 0))}</p>
        </div>
        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">المصروفات هذا الشهر</span>
            <TrendingUp className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(Number(monthStats?.totalExpenses || 0))}</p>
        </div>
        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">عدد المصروفات اليوم</span>
            <Receipt className="w-5 h-5 text-info" />
          </div>
          <p className="text-2xl font-bold text-foreground">{Number(todayStats?.totalCount || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">مصروف</p>
        </div>
        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">متوسط المصروف</span>
            <TrendingDown className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(Number(monthStats?.averageExpense || 0))}</p>
        </div>
      </div>

      <div className="flat-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث في المصروفات..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              className="w-full h-12 pr-12 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
            className="h-12 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">كل الفئات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>تصدير</span>
          </button>
        </div>
      </div>

      <div className="flat-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["التاريخ", "الوصف", "الفئة", "الفرع", "المبلغ", "طريقة الدفع", "الإجراءات"].map((h) => (
                  <th key={h} className="text-right p-4 text-sm font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-muted-foreground">جاري التحميل...</td>
                </tr>
              ) : expensesData?.data?.length > 0 ? (
                expensesData.data.map((expense: any) => (
                  <tr key={expense.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(expense.expenseDate).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium">{expense.title || "—"}</div>
                      {expense.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{expense.description}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {expense.category?.name || "—"}
                      </span>
                    </td>
                    <td className="p-4 text-sm">{expense.branch?.name || "—"}</td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-destructive">
                        {formatCurrency(Number(expense.amount || 0))}
                      </span>
                    </td>
                    <td className="p-4 text-sm">{paymentLabel[expense.paymentMethod] || expense.paymentMethod || "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(expense)} className="p-2 hover:bg-muted rounded-lg" title="تعديل">
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(expense.id)} className="p-2 hover:bg-muted rounded-lg" title="حذف">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-8">
                    <Receipt className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground">لا توجد مصروفات</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {expensesData?.pagination && expensesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              عرض {expensesData.data.length} من {expensesData.pagination.total} نتيجة
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50">السابق</button>
              <span className="text-sm">صفحة {page} من {expensesData.pagination.totalPages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page === expensesData.pagination.totalPages} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50">التالي</button>
            </div>
          </div>
        )}
      </div>

      <ExpenseDialog open={isDialogOpen} onClose={handleDialogClose} expense={selectedExpense} />
    </div>
  )
}
