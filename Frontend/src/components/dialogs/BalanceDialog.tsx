import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { DollarSign, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { customerService } from "@/services/api.service"
import { formatCurrency } from "@/lib/utils"

interface BalanceDialogProps {
  isOpen: boolean
  onClose: () => void
  customer: any
}

export default function BalanceDialog({ isOpen, onClose, customer }: BalanceDialogProps) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [operation, setOperation] = useState<"add" | "subtract">("add")
  const [notes, setNotes] = useState("")

  const updateMutation = useMutation({
    mutationFn: (data: any) => customerService.updateBalance(customer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({ amount, operation, notes })
  }

  const newBalance = operation === "add" ? (customer.balance || 0) + amount : (customer.balance || 0) - amount

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title="تعديل رصيد العميل" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">العميل</p>
          <p className="font-semibold">{customer?.name}</p>
          <p className="text-sm mt-2">الرصيد الحالي: <span className={customer?.balance > 0 ? "text-warning font-semibold" : "text-success font-semibold"}>{formatCurrency(Math.abs(customer?.balance || 0))}</span></p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">نوع العملية *</label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setOperation("add")} className={`p-3 border-2 rounded-lg ${operation === "add" ? "border-primary bg-primary/5" : "border-border"}`}>
              <p className="font-medium">إضافة دين</p><p className="text-xs text-muted-foreground">زيادة المبلغ المستحق</p>
            </button>
            <button type="button" onClick={() => setOperation("subtract")} className={`p-3 border-2 rounded-lg ${operation === "subtract" ? "border-primary bg-primary/5" : "border-border"}`}>
              <p className="font-medium">تسديد دفعة</p><p className="text-xs text-muted-foreground">تقليل المبلغ المستحق</p>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">المبلغ *</label>
          <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} min="0" step="0.01" required className="w-full px-3 py-2 border rounded-lg" />
        </div>

        <div className="p-3 bg-primary/5 rounded-lg">
          <p className="text-sm text-muted-foreground">الرصيد الجديد</p>
          <p className={`text-2xl font-bold ${newBalance > 0 ? "text-warning" : "text-success"}`}>{formatCurrency(Math.abs(newBalance))}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">ملاحظات</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">إلغاء</button>
          <button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
            {updateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>جاري الحفظ...</span></> : <><DollarSign className="w-4 h-4" /><span>تأكيد</span></>}</button>
        </div>
      </form>
    </BaseDialog>
  )
}
