import { Printer, X, Download, MessageCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { getCompanyInfo, getTaxConfig } from "@/lib/settings"
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
  const data =
    encode(1, companyName) +
    encode(2, taxNumber) +
    encode(3, new Date(invoice.saleDate || invoice.createdAt || new Date()).toISOString()) +
    encode(4, (Number(invoice.totalAmount) || 0).toFixed(2)) +
    encode(5, (Number(invoice.taxAmount) || 0).toFixed(2))
  return btoa(data)
}

function paymentLabel(method?: string) {
  switch (method) {
    case "cash": return "نقدي"
    case "card": return "بطاقة / شبكة"
    case "credit": return "آجل"
    case "split": return "مقسّم (كاش + بطاقة)"
    case "transfer": return "تحويل"
    default: return method || "—"
  }
}

export default function InvoicePreviewDialog({ isOpen, onClose, invoice }: InvoicePreviewDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const company = getCompanyInfo()
  const taxCfg = getTaxConfig()
  const companyName = company.name
  const taxNumber = company.taxNumber

  const isTaxInvoice = invoice?.invoiceType === "tax"
  const buyerTax =
    invoice?.buyerTaxNumber ||
    invoice?.customer?.taxNumber ||
    ""
  const buyerName =
    invoice?.buyerName ||
    invoice?.customer?.companyName ||
    invoice?.customer?.name ||
    "عميل نقدي"
  const taxRate = Number(invoice?.taxRate || taxCfg.rate || 0)

  useEffect(() => {
    if (!isOpen || !invoice) return
    const qrData = buildZatcaQRData(invoice, companyName, taxNumber || "000000000000000")
    QRCode.toDataURL(qrData, { width: 140, margin: 1 }).then(setQrDataUrl).catch(console.error)
  }, [isOpen, invoice, companyName, taxNumber])

  if (!isOpen || !invoice) return null

  const handlePrint = () => window.print()

  const handleExportPDF = async () => {
    if (!contentRef.current) return
    const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
    pdf.save(`${isTaxInvoice ? "فاتورة-ضريبية" : "فاتورة"}-${invoice.invoiceNumber || invoice.id}.pdf`)
  }

  const handleWhatsApp = () => {
    const phone = (invoice.customer?.phone || "").replace(/\D/g, "")
    const inv = invoice.invoiceNumber || invoice.id
    const total = Number(invoice.totalAmount || 0).toFixed(2)
    const lines = [
      `${isTaxInvoice ? "فاتورة ضريبية" : "فاتورة مبيعات"} من ${companyName}`,
      `رقم الفاتورة: ${inv}`,
      `العميل: ${buyerName}`,
      buyerTax ? `الرقم الضريبي للمشتري: ${buyerTax}` : "",
      taxNumber ? `الرقم الضريبي للبائع: ${taxNumber}` : "",
      `ضريبة القيمة المضافة: ${Number(invoice.taxAmount || 0).toFixed(2)}`,
      `الإجمالي شامل الضريبة: ${total}`,
    ].filter(Boolean)
    const text = encodeURIComponent(lines.join("\n"))
    const url = phone
      ? `https://wa.me/${phone.startsWith("0") ? "966" + phone.slice(1) : phone}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(url, "_blank")
  }

  const title = isTaxInvoice ? "فاتورة ضريبية" : "فاتورة مبيعات مبسطة"
  const subtitle = isTaxInvoice ? "Tax Invoice — B2B" : "Simplified Tax Invoice"

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-3xl mx-4 bg-card rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border print:hidden">
            <h2 className="text-xl font-bold">معاينة {title}</h2>
            <div className="flex gap-2">
              <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <MessageCircle className="w-4 h-4" /><span>واتساب</span>
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4" /><span>PDF</span>
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Printer className="w-4 h-4" /><span>طباعة</span>
              </button>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div id="invoice-content" ref={contentRef} className="max-w-2xl mx-auto bg-white text-black p-8" dir="rtl">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 border-b-2 border-gray-800 pb-5 gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">{companyName}</h1>
                  <p className="text-base font-semibold">{title}</p>
                  <p className="text-xs text-gray-500">{subtitle}</p>
                  {company.address && <p className="text-sm text-gray-600 mt-2">{company.address}</p>}
                  {company.phone && <p className="text-sm text-gray-600">هاتف: {company.phone}</p>}
                  {company.email && <p className="text-sm text-gray-600">بريد: {company.email}</p>}
                  {taxNumber && (
                    <p className="text-sm font-medium mt-2">الرقم الضريبي للبائع: {taxNumber}</p>
                  )}
                  {company.commercialRegister && (
                    <p className="text-sm text-gray-600">السجل التجاري: {company.commercialRegister}</p>
                  )}
                </div>
                {qrDataUrl && (
                  <div className="text-center shrink-0">
                    <img src={qrDataUrl} alt="QR Code" className="w-28 h-28" />
                    <p className="text-xs text-gray-400 mt-1">ZATCA QR</p>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="space-y-1">
                  <p><span className="text-gray-600">رقم الفاتورة: </span><span className="font-bold">{invoice.invoiceNumber || invoice.id}</span></p>
                  <p><span className="text-gray-600">التاريخ: </span><span className="font-bold">{new Date(invoice.saleDate || invoice.createdAt || new Date()).toLocaleString("ar-SA")}</span></p>
                  <p><span className="text-gray-600">نوع الفاتورة: </span><span className="font-bold">{isTaxInvoice ? "ضريبية (B2B)" : "مبسطة"}</span></p>
                  {invoice.invoiceUuid && (
                    <p className="text-xs text-gray-500 break-all">UUID: {invoice.invoiceUuid}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600 font-medium border-b border-gray-200 pb-1 mb-1">بيانات المشتري</p>
                  <p><span className="text-gray-600">الاسم: </span><span className="font-bold">{buyerName}</span></p>
                  {invoice.customer?.phone && (
                    <p><span className="text-gray-600">الهاتف: </span>{invoice.customer.phone}</p>
                  )}
                  {(isTaxInvoice || buyerTax) && (
                    <p><span className="text-gray-600">الرقم الضريبي: </span><span className="font-bold">{buyerTax || "—"}</span></p>
                  )}
                  {invoice.customer?.type === "company" && invoice.customer?.companyName && (
                    <p><span className="text-gray-600">المنشأة: </span>{invoice.customer.companyName}</p>
                  )}
                  <p><span className="text-gray-600">طريقة الدفع: </span>{paymentLabel(invoice.paymentMethod)}</p>
                </div>
              </div>

              {/* Items */}
              <table className="w-full mb-6 text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-800 bg-gray-50">
                    <th className="text-right py-2 px-1 font-bold">#</th>
                    <th className="text-right py-2 px-1 font-bold">المنتج</th>
                    <th className="text-center py-2 px-1 font-bold">الكمية</th>
                    <th className="text-center py-2 px-1 font-bold">السعر</th>
                    {isTaxInvoice && (
                      <>
                        <th className="text-center py-2 px-1 font-bold">ضريبة %</th>
                        <th className="text-center py-2 px-1 font-bold">قيمة الضريبة</th>
                      </>
                    )}
                    <th className="text-left py-2 px-1 font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, index: number) => {
                    const lineTotal = Number(item.totalAmount || item.total || item.quantity * item.unitPrice || 0)
                    const lineTax = Number(item.taxAmount || 0)
                    const lineRate = Number(item.taxRate || taxRate || 0)
                    return (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2 px-1">{index + 1}</td>
                        <td className="py-2 px-1">{item.product?.name || item.productName}</td>
                        <td className="text-center py-2 px-1">{item.quantity}</td>
                        <td className="text-center py-2 px-1">{formatCurrency(Number(item.unitPrice || item.price || 0))}</td>
                        {isTaxInvoice && (
                          <>
                            <td className="text-center py-2 px-1">{lineRate}%</td>
                            <td className="text-center py-2 px-1">{formatCurrency(lineTax)}</td>
                          </>
                        )}
                        <td className="text-left py-2 px-1 font-semibold">{formatCurrency(lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t-2 border-gray-800 pt-4 max-w-sm mr-auto space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع قبل الضريبة</span>
                  <span className="font-semibold">{formatCurrency(Number(invoice.subtotal || 0) - Number(invoice.discountAmount || 0))}</span>
                </div>
                {Number(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">الخصم</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(Number(invoice.discountAmount))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{taxCfg.name || "ضريبة القيمة المضافة"} ({taxRate}%)</span>
                  <span className="font-semibold">{formatCurrency(Number(invoice.taxAmount || 0))}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2 mt-2">
                  <span>الإجمالي شامل الضريبة</span>
                  <span>{formatCurrency(Number(invoice.totalAmount || invoice.total || 0))}</span>
                </div>
                {invoice.paidAmount != null && (
                  <>
                    <div className="flex justify-between">
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

              {isTaxInvoice && (
                <div className="mt-6 p-3 border border-gray-300 rounded text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800">إقرار ضريبي</p>
                  <p>هذه فاتورة ضريبية صادرة وفقاً لمتطلبات ضريبة القيمة المضافة. المشتري مسؤول عن التحقق من صحة رقمه الضريبي.</p>
                  <p>البائع: {companyName} — الرقم الضريبي: {taxNumber || "—"}</p>
                  <p>المشتري: {buyerName} — الرقم الضريبي: {buyerTax || "—"}</p>
                </div>
              )}

              {invoice.notes && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
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
