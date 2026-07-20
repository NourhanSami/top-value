import * as XLSX from "xlsx"
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx"
import jsPDF from "jspdf"

export type ExportFormat = "excel" | "pdf" | "word"

export interface ExportColumn {
  key: string
  label: string
}

export interface ExportOptions {
  filename: string
  title?: string
  subtitle?: string
  columns: ExportColumn[]
  rows: Record<string, any>[]
  dateFrom?: string
  dateTo?: string
}

function cellValue(row: Record<string, any>, key: string): string {
  const v = row[key]
  if (v == null) return ""
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

export function filterRowsByDate(
  rows: Record<string, any>[],
  dateKey: string,
  dateFrom?: string,
  dateTo?: string
): Record<string, any>[] {
  if (!dateFrom && !dateTo) return rows
  const from = dateFrom ? new Date(dateFrom) : null
  const to = dateTo ? new Date(dateTo) : null
  if (to) to.setHours(23, 59, 59, 999)
  return rows.filter((r) => {
    const raw = r[dateKey]
    if (!raw) return true
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return true
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
}

export async function exportToExcel(opts: ExportOptions) {
  const data = opts.rows.map((row) => {
    const obj: Record<string, string> = {}
    for (const col of opts.columns) obj[col.label] = cellValue(row, col.key)
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
  XLSX.writeFile(wb, `${opts.filename}.xlsx`)
}

export async function exportToPdf(opts: ExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const margin = 10
  let y = margin
  doc.setFontSize(14)
  doc.text(opts.title || opts.filename, margin, y)
  y += 7
  doc.setFontSize(10)
  if (opts.subtitle) {
    doc.text(opts.subtitle, margin, y)
    y += 6
  }
  if (opts.dateFrom || opts.dateTo) {
    doc.text(`الفترة: ${opts.dateFrom || "..."} → ${opts.dateTo || "..."}`, margin, y)
    y += 8
  }

  const colW = (doc.internal.pageSize.getWidth() - margin * 2) / Math.max(opts.columns.length, 1)
  doc.setFontSize(8)
  opts.columns.forEach((c, i) => {
    doc.text(c.label, margin + i * colW, y, { maxWidth: colW - 2 })
  })
  y += 5
  doc.setDrawColor(180)
  doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y)
  y += 4

  for (const row of opts.rows) {
    if (y > doc.internal.pageSize.getHeight() - 12) {
      doc.addPage()
      y = margin
    }
    opts.columns.forEach((c, i) => {
      doc.text(cellValue(row, c.key).slice(0, 40), margin + i * colW, y, { maxWidth: colW - 2 })
    })
    y += 5
  }
  doc.save(`${opts.filename}.pdf`)
}

export async function exportToWord(opts: ExportOptions) {
  const headerCells = opts.columns.map(
    (c) =>
      new TableCell({
        width: { size: Math.floor(9000 / opts.columns.length), type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: c.label, bold: true })] })],
      })
  )
  const bodyRows = opts.rows.map(
    (row) =>
      new TableRow({
        children: opts.columns.map(
          (c) =>
            new TableCell({
              width: { size: Math.floor(9000 / opts.columns.length), type: WidthType.DXA },
              children: [new Paragraph(cellValue(row, c.key))],
            })
        ),
      })
  )

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: opts.title || opts.filename, bold: true, size: 28 })],
    }),
  ]
  if (opts.subtitle) {
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(opts.subtitle)] }))
  }
  if (opts.dateFrom || opts.dateTo) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun(`الفترة: ${opts.dateFrom || "..."} → ${opts.dateTo || "..."}`)],
      })
    )
  }
  children.push(new Paragraph({ text: "" }))

  const doc = new Document({
    sections: [
      {
        children: [
          ...children,
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            rows: [new TableRow({ children: headerCells }), ...bodyRows],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${opts.filename}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportData(format: ExportFormat, opts: ExportOptions) {
  if (format === "excel") return exportToExcel(opts)
  if (format === "pdf") return exportToPdf(opts)
  return exportToWord(opts)
}
