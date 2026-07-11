import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Plus, Check } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { customerService } from "@/services/api.service"
import { formatCurrency } from "@/lib/utils"

interface SelectCustomerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (customer: any) => void
  selectedCustomerId?: number
}

export default function SelectCustomerDialog({
  isOpen,
  onClose,
  onSelect,
  selectedCustomerId,
}: SelectCustomerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch customers
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: () => customerService.getAll({
      search: searchTerm || undefined,
      limit: 50,
    }),
    enabled: isOpen,
  })

  const customers = customersResponse?.data || []

  const handleSelect = (customer: any) => {
    onSelect(customer)
    onClose()
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="اختر العميل"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="البحث عن عميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Add New Customer */}
        <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg hover:bg-muted transition-colors">
          <Plus className="w-5 h-5" />
          <span className="font-medium">إضافة عميل جديد</span>
        </button>

        {/* Customers List */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا يوجد عملاء
            </div>
          ) : (
            customers.map((customer: any) => (
              <button
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className={`w-full p-4 border rounded-lg text-right transition-colors ${
                  selectedCustomerId === customer.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{customer.name}</h4>
                      {selectedCustomerId === customer.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    {customer.address && (
                      <p className="text-sm text-muted-foreground mt-1">{customer.address}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${
                      customer.balance > 0 ? "text-warning" : "text-success"
                    }`}>
                      {formatCurrency(Math.abs(customer.balance || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customer.balance > 0 ? "عليه" : customer.balance < 0 ? "له" : "متوازن"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </BaseDialog>
  )
}
