import { Printer, X, Download } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import QRCode from "qrcode"
import { useEffect, useState, useRef } from "react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface InvoicePreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
}

function buildZatcaQRData(invoice: any, companyName: string, taxNumber: string): string {
  const encode = (tag: number, value: string) => {
    const bytes = new TextEncoder().encode(value)
    return String.fromCharCode(tag, bytes.length, ...Array.from(bytes))
  }
  const data = encode(1, companyName) + encode(2, taxNumber) + encode(3, new Date(invoice.saleDate || invoice.createdAt || new Date()).toISOString()) + encode(4, (Number(invoice.totalAmount) || 0).toFixed(2)) + encode(5, (Number(invoice.taxAmount) || 0).toFixed(2))
  return btoa(data)
}

export default function InvoicePreviewDialog({ isOpen, onClose, invoice }: InvoicePreviewDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const companyName = localStorage.getItem("company_name") || "نظام إدارة المخازن"
  const taxNumber = localStorage.getItem("company_tax_number") || ""

  useEffect(() => {
    if (!isOpen || !invoice) return
    const qrData = buildZatcaQRData(invoice, companyName, taxNumber)
    QRCode.toDataURL(qrData, { width: 120, margin: 1 }).then(setQrDataUrl).catch(console.error)
  }, [isOpen, invoice])

  if (!isOpen) return null

  const handlePrint = () => window.print()

  const handleExportPDF = async () => {
    if (!contentRef.current) return
    const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
    pdf.save(`فاتورة-${invoice.invoiceNumber || invoice.id}.pdf`)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-3xl mx-4 bg-card rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border print:hidden">
            <h2 className="text-xl font-bold">معاينة الفاتورة</h2>
            <div className="flex gap-2">
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4" /><span>PDF</span>
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Printer className="w-4 h-4" /><span>طباعة</span>
              </button>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div id="invoice-content" ref={contentRef} className="max-w-2xl mx-auto bg-white text-black p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8 border-b-2 border-gray-300 pb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{companyName}</h1>
                  <p className="text-gray-600">فاتورة مبيعات</p>
                  {taxNumber && <p className="text-sm text-gray-500 mt-1">الرقم الضريبي: {taxNumber}</p>}
                </div>
                {qrDataUrl && (
                  <div className="text-center">
                    <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
                    <p className="text-xs text-gray-400 mt-1">ZATCA QR</p>
                  </div>
                )}
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">رقم الفاتورة</p>
                  <p className="font-bold">{invoice.invoiceNumber || invoice.id}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-600">التاريخ</p>
                  <p className="font-bold">{new Date(invoice.saleDate || invoice.createdAt || new Date()).toLocaleDateString('ar-EG')}</p>
                </div>
                {invoice.customer && (
                  <div>
                    <p className="text-sm text-gray-600">العميل</p>
                    <p className="font-bold">{invoice.customer.name}</p>
                    <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm text-gray-600">طريقة الدفع</p>
                  <p className="font-bold">{invoice.paymentMethod === "cash" ? "نقدي" : invoice.paymentMethod === "card" ? "بطاقة" : "آجل"}</p>
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
                      <td className="text-center py-3">{formatCurrency(Number(item.unitPrice || item.price || 0))}</td>
                      <td className="text-left py-3 font-semibold">{formatCurrency(Number(item.totalAmount || item.total || item.quantity * item.unitPrice || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t-2 border-gray-300 pt-4">
                {Number(invoice.subtotal) > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">المجموع الفرعي</span>
                    <span className="font-semibold">{formatCurrency(Number(invoice.subtotal))}</span>
                  </div>
                )}
                {Number(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">الخصم</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(Number(invoice.discountAmount))}</span>
                  </div>
                )}
                {Number(invoice.taxAmount) > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">الضريبة</span>
                    <span className="font-semibold">{formatCurrency(Number(invoice.taxAmount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t border-gray-300 pt-2 mt-2">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(Number(invoice.totalAmount || invoice.total || 0))}</span>
                </div>
                {invoice.paidAmount && (
                  <>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600">المدفوع</span>
                      <span>{formatCurrency(Number(invoice.paidAmount))}</span>
                    </div>
                    {Number(invoice.paidAmount) < Number(invoice.totalAmount) && (
                      <div className="flex justify-between text-orange-600">
                        <span>المتبقي</span>
                        <span>{formatCurrency(Number(invoice.totalAmount) - Number(invoice.paidAmount))}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {invoice.notes && (
                <div className="mt-6 p-4 bg-gray-100 rounded">
                  <p className="text-sm text-gray-600 mb-1">ملاحظات:</p>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}

              <div className="mt-8 text-center text-sm text-gray-600 border-t border-gray-300 pt-4">
                <p>شكراً لتعاملكم معنا</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-content, #invoice-content * { visibility: visible; }
          #invoice-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
