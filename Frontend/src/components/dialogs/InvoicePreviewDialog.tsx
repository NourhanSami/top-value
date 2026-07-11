import { Printer, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface InvoicePreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
}

export default function InvoicePreviewDialog({
  isOpen,
  onClose,
  invoice,
}: InvoicePreviewDialogProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative w-full max-w-3xl mx-4 bg-card rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header - Hidden on print */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border print:hidden">
            <h2 className="text-xl font-bold">معاينة الفاتورة</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div id="invoice-content" className="max-w-2xl mx-auto bg-white text-black p-8">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
                <h1 className="text-3xl font-bold mb-2">نظام المخازن ونقاط البيع</h1>
                <p className="text-gray-600">فاتورة مبيعات</p>
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">رقم الفاتورة</p>
                  <p className="font-bold">{invoice.invoiceNumber || invoice.id}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-600">التاريخ</p>
                  <p className="font-bold">
                    {new Date(invoice.createdAt || invoice.date).toLocaleDateString('ar-EG')}
                  </p>
                </div>
                {invoice.customer && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">العميل</p>
                      <p className="font-bold">{invoice.customer.name}</p>
                      <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                    </div>
                  </>
                )}
                <div className="text-left">
                  <p className="text-sm text-gray-600">طريقة الدفع</p>
                  <p className="font-bold">
                    {invoice.paymentMethod === "cash"
                      ? "نقدي"
                      : invoice.paymentMethod === "card"
                      ? "بطاقة"
                      : "آجل"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-right py-2 font-bold">#</th>
                    <th className="text-right py-2 font-bold">المنتج</th>
                    <th className="text-center py-2 font-bold">الكمية</th>
                    <th className="text-center py-2 font-bold">السعر</th>
                    <th className="text-left py-2 font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3">{index + 1}</td>
                      <td className="py-3">{item.product?.name || item.productName}</td>
                      <td className="text-center py-3">{item.quantity}</td>
                      <td className="text-center py-3">
                        {formatCurrency(item.unitPrice || item.price)}
                      </td>
                      <td className="text-left py-3 font-semibold">
                        {formatCurrency(item.total || item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">المجموع الفرعي</span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.totalAmount || invoice.total)}
                  </span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">الضريبة ({invoice.taxRate}%)</span>
                    <span className="font-semibold">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t border-gray-300 pt-2 mt-2">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(invoice.totalAmount || invoice.total)}</span>
                </div>
                {invoice.amountPaid && (
                  <>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600">المدفوع</span>
                      <span>{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    {invoice.amountPaid < invoice.totalAmount && (
                      <div className="flex justify-between text-warning">
                        <span>المتبقي</span>
                        <span>{formatCurrency(invoice.totalAmount - invoice.amountPaid)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-6 p-4 bg-gray-100 rounded">
                  <p className="text-sm text-gray-600 mb-1">ملاحظات:</p>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 text-center text-sm text-gray-600 border-t border-gray-300 pt-4">
                <p>شكراً لتعاملكم معنا</p>
                <p className="mt-1">نتمنى لكم يوماً سعيداً</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content,
          #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
