import { useState } from "react"
import { Printer } from "lucide-react"
import BaseDialog from "./BaseDialog"

interface PrintBarcodeDialogProps {
  isOpen: boolean
  onClose: () => void
  product: any
}

export default function PrintBarcodeDialog({ isOpen, onClose, product }: PrintBarcodeDialogProps) {
  const [copies, setCopies] = useState(1)
  const [paperSize, setPaperSize] = useState("80mm")

  const handlePrint = () => {
    window.print()
  }

  if (!product) return null

  return (
    <>
      <BaseDialog isOpen={isOpen} onClose={onClose} title="طباعة الباركود" maxWidth="md">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">حجم الورق</label>
              <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="58mm">58mm (حراري)</option>
                <option value="80mm">80mm (حراري)</option>
                <option value="A4">A4 (عادي)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">عدد النسخ</label>
              <input type="number" value={copies} onChange={(e) => setCopies(parseInt(e.target.value) || 1)} min="1" max="100" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div id="barcode-preview" className="border-2 border-dashed rounded-lg p-4 text-center bg-white">
            <svg className="mx-auto mb-2" width="200" height="80">
              <rect width="2" height="80" x="10" y="0" fill="black" />
              <rect width="4" height="80" x="14" y="0" fill="black" />
              <rect width="2" height="80" x="20" y="0" fill="black" />
              <rect width="6" height="80" x="24" y="0" fill="black" />
              <rect width="2" height="80" x="32" y="0" fill="black" />
              <text x="100" y="95" textAnchor="middle" fontSize="12">{product.barcode || "123456789"}</text>
            </svg>
            <p className="font-semibold text-sm">{product.name}</p>
            <p className="text-primary font-bold">{product.sellingPrice || product.price} ر.س</p>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg">إلغاء</button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              <Printer className="w-4 h-4" /><span>طباعة</span>
            </button>
          </div>
        </div>
      </BaseDialog>

      <style>{`@media print { body * { visibility: hidden; } #barcode-preview, #barcode-preview * { visibility: visible; } #barcode-preview { position: absolute; left: 0; top: 0; } }`}</style>
    </>
  )
}
