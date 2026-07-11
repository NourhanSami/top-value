import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ShoppingCart, Loader2, CreditCard, Banknote, Smartphone } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { saleService } from "@/services/api.service"
import { formatCurrency } from "@/lib/utils"

interface CompleteSaleDialogProps {
  isOpen: boolean
  onClose: () => void
  cartItems: any[]
  customer: any
  totalAmount: number
  onSuccess: (saleData: any) => void
}

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي", icon: Banknote },
  { value: "card", label: "بطاقة", icon: CreditCard },
  { value: "credit", label: "آجل", icon: Smartphone },
]

export default function CompleteSaleDialog({
  isOpen,
  onClose,
  cartItems,
  customer,
  totalAmount,
  onSuccess,
}: CompleteSaleDialogProps) {
  const queryClient = useQueryClient()
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [amountPaid, setAmountPaid] = useState<number>(totalAmount)
  const [notes, setNotes] = useState<string>("")

  const remaining = totalAmount - amountPaid
  const change = amountPaid > totalAmount ? amountPaid - totalAmount : 0

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: (data: any) => saleService.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      onSuccess(response.data)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const saleData = {
      customerId: customer?.id,
      paymentMethod,
      amountPaid: paymentMethod === "cash" ? amountPaid : totalAmount,
      items: cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity,
      })),
      totalAmount,
      notes,
    }

    createSaleMutation.mutate(saleData)
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="إتمام عملية البيع"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        {customer && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">العميل</p>
            <p className="font-semibold">{customer.name}</p>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          </div>
        )}

        {/* Total Amount */}
        <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">إجمالي المبلغ</p>
          <p className="text-4xl font-bold text-primary">
            {formatCurrency(totalAmount)}
          </p>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium mb-3">
            طريقة الدفع <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === method.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${
                    paymentMethod === method.value ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <p className={`text-sm font-medium ${
                    paymentMethod === method.value ? "text-primary" : "text-foreground"
                  }`}>
                    {method.label}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount Paid (only for cash) */}
        {paymentMethod === "cash" && (
          <div>
            <label className="block text-sm font-medium mb-2">
              المبلغ المدفوع
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 text-lg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Change Display */}
            {change > 0 && (
              <div className="mt-3 p-3 bg-success-light rounded-lg">
                <p className="text-sm text-muted-foreground">الباقي للعميل</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(change)}
                </p>
              </div>
            )}

            {remaining > 0 && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm text-muted-foreground">المتبقي</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(remaining)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Credit Warning */}
        {paymentMethod === "credit" && customer && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-sm text-warning-foreground">
              سيتم إضافة {formatCurrency(totalAmount)} إلى رصيد العميل المستحق
            </p>
            {customer.balance > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                الرصيد الحالي: {formatCurrency(customer.balance)}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="أي ملاحظات إضافية..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={createSaleMutation.isPending || (paymentMethod === "cash" && remaining > 0)}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createSaleMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                <span>إتمام البيع</span>
              </>
            )}
          </button>
        </div>
      </form>
    </BaseDialog>
  )
}
