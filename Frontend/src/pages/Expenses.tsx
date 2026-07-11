import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseService } from '@/services/api.service'
import { 
  Receipt, 
  Search, 
  Plus,
  Download,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { ExpenseDialog } from '@/components/dialogs'

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)

  const queryClient = useQueryClient()

  // Fetch expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', page, categoryFilter, searchTerm],
    queryFn: () => expenseService.getAll({
      page,
      limit: 20,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      search: searchTerm || undefined
    })
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      alert('تم حذف المصروف بنجاح')
    },
    onError: () => {
      alert('فشل حذف المصروف')
    }
  })

  const handleEdit = (expense: any) => {
    setSelectedExpense(expense)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      deleteMutation.mutate(id)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedExpense(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المصروفات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة ومتابعة جميع المصروفات والنفقات
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مصروف</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              إجمالي المصروفات اليوم
            </span>
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">0.00</p>
          <p className="text-xs text-muted-foreground mt-1">ر.س</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              المصروفات هذا الشهر
            </span>
            <TrendingUp className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-foreground">0.00</p>
          <p className="text-xs text-warning mt-1">ر.س</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              عدد المصروفات اليوم
            </span>
            <Receipt className="w-5 h-5 text-info" />
          </div>
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground mt-1">مصروف</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              متوسط المصروف
            </span>
            <TrendingDown className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">0.00</p>
          <p className="text-xs text-muted-foreground mt-1">ر.س</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flat-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث في المصروفات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pr-12 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-12 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">كل الفئات</option>
            <option value="rent">إيجار</option>
            <option value="utilities">مرافق</option>
            <option value="salaries">رواتب</option>
            <option value="supplies">مستلزمات</option>
            <option value="maintenance">صيانة</option>
            <option value="other">أخرى</option>
          </select>

          {/* Export Button */}
          <button className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" />
            <span>تصدير</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="flat-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  التاريخ
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  الوصف
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  الفئة
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  الفرع
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  المبلغ
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  طريقة الدفع
                </th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">جاري التحميل...</span>
                    </div>
                  </td>
                </tr>
              ) : expensesData?.data && expensesData.data.length > 0 ? (
                expensesData.data.map((expense: any) => (
                  <tr key={expense.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {new Date(expense.expenseDate).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {expense.description}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {expense.category === 'rent' ? 'إيجار' :
                         expense.category === 'utilities' ? 'مرافق' :
                         expense.category === 'salaries' ? 'رواتب' :
                         expense.category === 'supplies' ? 'مستلزمات' :
                         expense.category === 'maintenance' ? 'صيانة' : 'أخرى'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {expense.branch?.name || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-destructive">
                        {parseFloat(expense.amount).toFixed(2)} ر.س
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {expense.paymentMethod === 'cash' ? 'نقدي' : 
                         expense.paymentMethod === 'card' ? 'بطاقة' :
                         expense.paymentMethod === 'transfer' ? 'تحويل' : 'شيك'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">لا توجد مصروفات</p>
                      <p className="text-sm text-muted-foreground">
                        ابدأ بإضافة أول مصروف
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {expensesData?.pagination && expensesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              عرض {expensesData.data.length} من {expensesData.pagination.total} نتيجة
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <span className="text-sm text-foreground">
                صفحة {page} من {expensesData.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === expensesData.pagination.totalPages}
                className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expense Dialog */}
      <ExpenseDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        expense={selectedExpense}
      />
    </div>
  )
}
