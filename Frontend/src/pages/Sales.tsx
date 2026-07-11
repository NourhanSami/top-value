import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { saleService } from '@/services/api.service'
import { 
  ShoppingCart, 
  Search, 
  Filter,
  Download,
  Eye,
  Printer,
  MoreHorizontal
} from 'lucide-react'

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Fetch sales
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, statusFilter, searchTerm],
    queryFn: () => saleService.getAll({
      page,
      limit: 20,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm || undefined
    })
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المبيعات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة ومتابعة جميع عمليات البيع
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              إجمالي المبيعات اليوم
            </span>
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-xs text-muted-foreground mt-1">0.00 ر.س</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              الفواتير المكتملة
            </span>
            <ShoppingCart className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-xs text-success mt-1">100%</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              الفواتير المعلقة
            </span>
            <ShoppingCart className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-foreground">0</p>
          <p className="text-xs text-warning mt-1">0%</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              متوسط قيمة الفاتورة
            </span>
            <ShoppingCart className="w-5 h-5 text-info" />
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
              placeholder="البحث برقم الفاتورة أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pr-12 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">كل الحالات</option>
            <option value="completed">مكتملة</option>
            <option value="pending">معلقة</option>
            <option value="cancelled">ملغاة</option>
          </select>

          {/* Export Button */}
          <button className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" />
            <span>تصدير</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="flat-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  رقم الفاتورة
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  التاريخ
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  العميل
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  المبلغ الإجمالي
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  طريقة الدفع
                </th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">
                  الحالة
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
              ) : salesData?.data && salesData.data.length > 0 ? (
                salesData.data.map((sale: any) => (
                  <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-sm text-foreground">
                        {sale.invoiceNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {new Date(sale.saleDate).toLocaleDateString('ar-EG')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {sale.customer?.name || 'عميل نقدي'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-foreground">
                        {parseFloat(sale.totalAmount).toFixed(2)} ر.س
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {sale.paymentMethod === 'cash' ? 'نقدي' : 
                         sale.paymentMethod === 'card' ? 'بطاقة' :
                         sale.paymentMethod === 'transfer' ? 'تحويل' : 'آجل'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'completed' ? 'bg-success/10 text-success' :
                        sale.status === 'pending' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {sale.status === 'completed' ? 'مكتملة' :
                         sale.status === 'pending' ? 'معلقة' : 'ملغاة'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <Printer className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">لا توجد مبيعات</p>
                      <p className="text-sm text-muted-foreground">
                        ابدأ بإنشاء فاتورة جديدة من نقطة البيع
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {salesData?.pagination && salesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              عرض {salesData.data.length} من {salesData.pagination.total} نتيجة
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
                صفحة {page} من {salesData.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === salesData.pagination.totalPages}
                className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
