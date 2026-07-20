import { useState } from "react"
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react"
import { exportData, type ExportColumn, type ExportFormat } from "@/lib/exportUtils"
import toast from "react-hot-toast"

interface ExportMenuProps {
  filename: string
  title?: string
  subtitle?: string
  columns: ExportColumn[]
  rows: Record<string, any>[]
  dateKey?: string
  /** Hide date range when exporting master data without meaningful dates */
  showDateFilter?: boolean
  className?: string
}

const DATE_FALLBACK_KEYS = [
  "saleDate", "returnDate", "expenseDate", "orderDate", "quotationDate",
  "voucherDate", "transferDate", "dueDate", "damagedAt", "routeDate",
  "date", "createdAt", "created_at",
]

export function ExportMenu({
  filename,
  title,
  subtitle,
  columns,
  rows,
  dateKey = "createdAt",
  showDateFilter = true,
  className,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [busy, setBusy] = useState(false)

  const resolveDate = (r: Record<string, any>) => {
    if (r[dateKey]) return r[dateKey]
    for (const k of DATE_FALLBACK_KEYS) {
      if (r[k]) return r[k]
    }
    return null
  }

  const filtered = (() => {
    if (!showDateFilter || (!dateFrom && !dateTo)) return rows
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(dateTo) : null
    if (to) to.setHours(23, 59, 59, 999)
    return rows.filter((r) => {
      const raw = resolveDate(r)
      if (!raw) return true
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return true
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  })()

  const run = async (format: ExportFormat) => {
    if (!filtered.length) {
      toast.error("لا توجد بيانات للتصدير في الفترة المحددة")
      return
    }
    setBusy(true)
    try {
      await exportData(format, {
        filename,
        title,
        subtitle,
        columns,
        rows: filtered,
        dateFrom: showDateFilter ? (dateFrom || undefined) : undefined,
        dateTo: showDateFilter ? (dateTo || undefined) : undefined,
      })
      toast.success("تم التصدير بنجاح")
      setOpen(false)
    } catch (e: any) {
      toast.error(e?.message || "فشل التصدير")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-10 px-4 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
      >
        <Download className="w-4 h-4" />
        تصدير
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-card border border-border rounded-2xl shadow-xl p-4 space-y-3">
            <p className="text-sm font-semibold">تصدير — PDF / Word / Excel</p>
            {showDateFilter && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">من تاريخ</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-border rounded-lg text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">إلى تاريخ</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 border border-border rounded-lg text-sm bg-background"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{filtered.length} صف بعد التصفية</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                disabled={busy}
                onClick={() => run("excel")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-muted text-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
              </button>
              <button
                disabled={busy}
                onClick={() => run("pdf")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-muted text-sm disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-red-600" /> PDF
              </button>
              <button
                disabled={busy}
                onClick={() => run("word")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-muted text-sm disabled:opacity-50"
              >
                <FileType className="w-4 h-4 text-blue-600" /> Word
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
