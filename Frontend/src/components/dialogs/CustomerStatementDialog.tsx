import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Printer, X, Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import { ExportMenu } from "@/components/ui/ExportMenu"

interface CustomerStatementDialogProps {
  customerId: number | null
  customerName?: string
  isOpen: boolean
  onClose: () => void
}

export default function CustomerStatementDialog({
  customerId,
  customerName,
  isOpen,
  onClose,
}: CustomerStatementDialogProps) {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-statement", customerId, dateFrom, dateTo],
    queryFn: () =>
      api
        .get(`/customers/${customerId}/statement`, {
          params: {
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
        .then((r) => r.data),
    enabled: isOpen && !!customerId,
  })

  if (!isOpen || !customerId) return null

  const statement = data?.data
  const customer = statement?.customer
  const movements = statement?.movements || []
  const summary = statement?.summary

  const exportRows = movements.map((m: any) => ({
    date: m.date,
    typeLabel: m.typeLabel,
    reference: m.reference,
    description: m.description,
    debit: m.debit,
    credit: m.credit,
    runningBalance: m.runningBalance,
    paymentMethod: m.paymentMethod,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border print:hidden">
          <div>
            <h2 className="text-lg font-bold">كشف حساب العميل</h2>
            <p className="text-sm text-muted-foreground">{customerName || customer?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              filename={`كشف-حساب-${customer?.id || customerId}`}
              title={`كشف حساب — ${customer?.name || customerName || ""}`}
              subtitle={`الرصيد الحالي: ${summary?.currentBalance ?? ""}`}
              columns={[
                { key: "date", label: "التاريخ" },
                { key: "typeLabel", label: "نوع الحركة" },
                { key: "reference", label: "المرجع" },
                { key: "description", label: "الوصف" },
                { key: "debit", label: "مدين" },
                { key: "credit", label: "دائن" },
                { key: "runningBalance", label: "الرصيد" },
                { key: "paymentMethod", label: "طريقة الدفع" },
              ]}
              rows={exportRows}
              dateKey="date"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 h-10 px-3 border rounded-xl text-sm hover:bg-muted"
            >
              <Printer className="w-4 h-4" /> طباعة
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-border print:hidden flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">من</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block mt-1 px-3 py-2 border rounded-xl text-sm bg-background"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">إلى</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block mt-1 px-3 py-2 border rounded-xl text-sm bg-background"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" id="customer-statement-print">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <p className="text-destructive text-sm">تعذر تحميل كشف الحساب</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">رقم العميل</p>
                  <p className="font-bold">{customer?.id}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">الهاتف</p>
                  <p className="font-bold">{customer?.phone || "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">إجمالي المشتريات</p>
                  <p className="font-bold">{formatCurrency(Number(summary?.totalPurchases || 0))}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <p className="text-muted-foreground">الرصيد الحالي</p>
                  <p className="font-bold text-primary">{formatCurrency(Number(summary?.currentBalance || 0))}</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["التاريخ", "نوع الحركة", "المرجع", "الوصف", "مدين", "دائن/سداد", "الرصيد"].map((h) => (
                        <th key={h} className="px-3 py-2 text-right font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                          لا توجد حركات في هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      movements.map((m: any) => (
                        <tr key={m.id} className="border-t border-border">
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(m.date)}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-lg text-xs bg-muted">{m.typeLabel}</span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{m.reference}</td>
                          <td className="px-3 py-2 max-w-xs truncate">{m.description}</td>
                          <td className="px-3 py-2">{m.debit ? formatCurrency(m.debit) : "—"}</td>
                          <td className="px-3 py-2">{m.credit ? formatCurrency(m.credit) : "—"}</td>
                          <td className="px-3 py-2 font-medium">{formatCurrency(m.runningBalance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
