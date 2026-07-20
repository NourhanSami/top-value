import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { saleService } from '@/services/api.service'
import {
  ShoppingCart,
  Search,
  Download,
  Eye,
  Printer,
  MoreHorizontal,
} from 'lucide-react'
import InvoicePreviewDialog from '@/components/dialogs/InvoicePreviewDialog'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { formatCurrency } from '@/lib/utils'

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, statusFilter, searchTerm],
    queryFn: () => saleService.getAll({
      page,
      limit: 20,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm || undefined
    })
  })

  const { data: statsRes } = useQuery({
    queryKey: ['sales-statistics'],
    queryFn: () => saleService.getStatistics({ period: 'month' })
  })

  const stats = statsRes?.data
  const sales = salesData?.data || []

  const handleExport = () => {
    if (!sales.length) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }
    const rows = sales.map((s: any) => ({
      'رقم الفاتورة': s.invoiceNumber,
      'التاريخ': new Date(s.saleDate).toLocaleDateString('ar-EG'),
      'العميل': s.customer?.name || 'عميل نقدي',
      'المبلغ': Number(s.totalAmount),
      'طريقة الدفع': s.paymentMethod === 'cash' ? 'نقدي' : s.paymentMethod === 'card' ? 'بطاقة' : s.paymentMethod === 'transfer' ? 'تحويل' : 'آجل',
      'الحالة': s.status === 'completed' ? 'مكتملة' : s.status === 'pending' ? 'معلقة' : 'ملغاة',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المبيعات')
    XLSX.writeFile(wb, `sales-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('تم تصدير البيانات بنجاح')
  }

  const todayCount = Number(stats?.totalOrders || 0)
  const todayAmount = Number(stats?.totalSales || 0)
  const completedCount = Number(stats?.completedCount ?? stats?.totalOrders ?? 0)
  const pendingCount = Number(stats?.pendingCount || 0)
  const avgValue = Number(stats?.averageOrderValue || 0)
  const totalForPct = completedCount + pendingCount + Number(stats?.cancelledCount || 0)
  const completedPct = totalForPct > 0 ? Math.round((completedCount / totalForPct) * 100) : 0

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المبيعات</h1>
          <p className="text-muted-foreground mt-1">
            إدارة ومتابعة جميع عمليات البيع
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">إجمالي المبيعات (الشهر)</span>
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{todayCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(todayAmount)}</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">الفواتير المكتملة</span>
            <ShoppingCart className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{completedCount}</p>
          <p className="text-xs text-success mt-1">{completedPct}%</p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">الفواتير المعلقة</span>
            <ShoppingCart className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
          <p className="text-xs text-warning mt-1">
            {totalForPct > 0 ? Math.round((pendingCount / totalForPct) * 100) : 0}%
          </p>
        </div>

        <div className="flat-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">متوسط قيمة الفاتورة</span>
            <ShoppingCart className="w-5 h-5 text-info" />
          </div>
          <p className="text-2xl font-bold text-foreground">{avgValue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">ر.س</p>
        </div>
      </div>

      <div className="flat-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
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
                <th className="text-right p-4 text-sm font-semibold text-foreground">رقم الفاتورة</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">التاريخ</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">العميل</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">المبلغ الإجمالي</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">طريقة الدفع</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">الحالة</th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">الإجراءات</th>
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
              ) : sales.length > 0 ? (
                sales.map((sale: any) => (
                  <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-sm text-foreground">{sale.invoiceNumber}</span>
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
                      <div className="flex items-center justify-center gap-2 relative">
                        <button
                          onClick={() => setSelectedInvoice(sale)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="عرض الفاتورة"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => { setSelectedInvoice(sale); setTimeout(() => window.print(), 300) }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="طباعة"
                        >
                          <Printer className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === sale.id ? null : sale.id)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="المزيد"
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {openMenuId === sale.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute left-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-20 p-1">
                                <button
                                  onClick={() => { setSelectedInvoice(sale); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg"
                                >
                                  <Eye className="w-4 h-4" /> معاينة
                                </button>
                                <button
                                  onClick={() => { setSelectedInvoice(sale); setOpenMenuId(null); setTimeout(() => window.print(), 300) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg"
                                >
                                  <Printer className="w-4 h-4" /> طباعة
                                </button>
                                <button
                                  onClick={() => {
                                    const row = [{
                                      'رقم الفاتورة': sale.invoiceNumber,
                                      'التاريخ': new Date(sale.saleDate).toLocaleDateString('ar-EG'),
                                      'العميل': sale.customer?.name || 'عميل نقدي',
                                      'المبلغ': Number(sale.totalAmount),
                                    }]
                                    const ws = XLSX.utils.json_to_sheet(row)
                                    const wb = XLSX.utils.book_new()
                                    XLSX.utils.book_append_sheet(wb, ws, 'فاتورة')
                                    XLSX.writeFile(wb, `${sale.invoiceNumber}.xlsx`)
                                    toast.success('تم تصدير الفاتورة')
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg"
                                >
                                  <Download className="w-4 h-4" /> تصدير Excel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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

        {salesData?.pagination && salesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              عرض {sales.length} من {salesData.pagination.total} نتيجة
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
    <InvoicePreviewDialog
      isOpen={!!selectedInvoice}
      onClose={() => setSelectedInvoice(null)}
      invoice={selectedInvoice}
    />
    </>
  )
}
