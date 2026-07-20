import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Plus, Minus, Trash2, ShoppingCart, User, DollarSign, CreditCard, Wallet } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { productService, customerService, saleService } from "@/services/api.service"
import { useAuth } from "@/contexts/AuthContext"
import { SelectCustomerDialog } from "@/components/dialogs"
import type { Product, Customer } from "@/types"

interface CartItem {
  product: Product
  quantity: number
}

type PaymentMethod = "cash" | "card" | "credit"

export default function POS() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash")
  const [discountPercent, setDiscountPercent] = useState(0)

  // Fetch products
  const { data: productsResponse } = useQuery({
    queryKey: ["products", searchTerm, selectedCategory],
    queryFn: () => {
      // Find category ID from name
      let categoryId: number | undefined
      
      if (selectedCategory !== "الكل" && categoriesResponse?.data) {
        const foundProduct = categoriesResponse.data.find((p: any) => {
          const catName = typeof p.category === 'object' ? p.category.name : p.category
          return catName === selectedCategory
        })
        
        if (foundProduct && foundProduct.category) {
          categoryId = typeof foundProduct.category === 'object' 
            ? foundProduct.category.id 
            : undefined
        }
      }
      
      return productService.getAll({
        search: searchTerm || undefined,
        categoryId: categoryId,
        limit: 100,
      })
    },
  })

  const products = productsResponse?.data || []

  // Fetch categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productService.getAll({ limit: 1000 }),
  })

  // Extract unique categories from products
  const uniqueCategories = new Set<string>()
  
  if (categoriesResponse?.data) {
    categoriesResponse.data.forEach((product: any) => {
      if (product.category) {
        // Check if category is an object with name property
        const categoryName = typeof product.category === 'object' 
          ? product.category.name 
          : product.category
        
        if (categoryName) {
          uniqueCategories.add(categoryName)
        }
      }
    })
  }
  
  const categories = ["الكل", ...Array.from(uniqueCategories)]

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: (saleData: any) => saleService.create(saleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      clearCart()
      setShowPaymentDialog(false)
      alert("تمت عملية البيع بنجاح!")
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "فشل في إتمام عملية البيع"
      alert(errorMessage)
    },
  })

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.product.id === product.id)
    
    // Get available stock quantity
    const availableStock = product.stockQuantity || product.stock || 0
    const productPrice = product.sellingPrice || product.price || 0

    if (existingItem) {
      if (existingItem.quantity < availableStock) {
        setCart(
          cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
      }
    } else {
      if (availableStock > 0) {
        // Normalize product data
        const normalizedProduct = {
          ...product,
          stock: availableStock,
          price: productPrice
        }
        
        setCart([...cart, { product: normalizedProduct, quantity: 1 }])
      } else {
        alert('هذا المنتج غير متوفر في المخزون')
      }
    }
  }

  const updateQuantity = (productId: number, change: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + change
            if (newQuantity <= 0) return null
            if (newQuantity > item.product.stock) return item
            return { ...item, quantity: newQuantity }
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    )
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const getTotalAmount = () => {
    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    return Math.round((total + Number.EPSILON) * 100) / 100
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setSelectedPaymentMethod("cash")
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    setShowPaymentDialog(true)
  }

  const handleConfirmPayment = async () => {
    if (!user) {
      alert("يجب تسجيل الدخول أولاً")
      return
    }

    // Get user's branch ID - try multiple possible property names
    const userBranchId = user.branchId || user.branch_id || user.branch?.id
    
    if (!userBranchId) {
      alert("لا يمكن تحديد الفرع الخاص بك. يرجى تسجيل الدخول مرة أخرى")
      return
    }

    // Calculate totals
    const subtotal = getTotalAmount()
    const taxAmount = 0
    const discountAmount = parseFloat(((subtotal * discountPercent) / 100).toFixed(2))
    const totalAmount = subtotal + taxAmount - discountAmount
    const paidAmount = totalAmount
    const changeAmount = 0

    const saleData = {
      customerId: selectedCustomer?.id,
      branchId: userBranchId,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: parseFloat(String(item.product.price)),
        taxRate: 0,
        discountRate: 0
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      paidAmount: parseFloat(paidAmount.toFixed(2)),
      changeAmount: parseFloat(changeAmount.toFixed(2)),
      paymentMethod: selectedPaymentMethod,
      loyaltyPointsUsed: 0,
      notes: selectedCustomer ? `فاتورة للعميل: ${selectedCustomer.name}` : 'فاتورة نقدية'
    }

    console.log('Sending sale data:', saleData)

    try {
      await createSaleMutation.mutateAsync(saleData)
    } catch (error: any) {
      console.error('Sale error:', error)
      const errorMsg = error.response?.data?.message || error.message || 'فشل في إتمام عملية البيع'
      alert(errorMsg)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pr-11 pl-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((category, index) => (
              <button
                key={`category-${index}-${category}`}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-muted border border-border"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: any) => {
              const availableStock = product.stockQuantity || product.stock || 0
              const productPrice = product.sellingPrice || product.price || 0
              
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={availableStock === 0}
                  className="flat-card hover-lift p-4 text-right disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(productPrice)}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-md",
                        availableStock > 0
                          ? "bg-success-light text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {availableStock > 0 ? `متوفر: ${availableStock}` : "نفذ"}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 flex flex-col gap-4">
        {/* Customer Selection */}
        <div className="flat-card p-4">
          <button
            onClick={() => setShowCustomerDialog(true)}
            className="w-full flex items-center gap-3 p-3 bg-accent rounded-xl hover:bg-accent/80 transition-colors"
          >
            <User className="w-5 h-5 text-primary" />
            <div className="flex-1 text-right">
              <p className="text-sm font-medium text-foreground">
                {selectedCustomer ? selectedCustomer.name : "اختر عميل"}
              </p>
              {selectedCustomer && (
                <p className="text-xs text-muted-foreground">
                  {selectedCustomer.phone}
                </p>
              )}
            </div>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 flat-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              السلة ({cart.length})
            </h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-destructive hover:text-destructive/80"
              >
                مسح الكل
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">السلة فارغة</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-3 bg-muted rounded-xl"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-foreground flex-1">
                      {item.product.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-card rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.product.price)} × {item.quantity}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">المجموع الفرعي</span>
              <span className="text-sm font-medium">{formatCurrency(getTotalAmount())}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-muted-foreground">خصم %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-20 h-8 px-2 text-center bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {discountPercent > 0 && (
              <div className="flex items-center justify-between mb-2 text-destructive">
                <span className="text-sm">الخصم ({discountPercent}%)</span>
                <span className="text-sm font-medium">- {formatCurrency((getTotalAmount() * discountPercent) / 100)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-foreground">
                الإجمالي
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(getTotalAmount() - (getTotalAmount() * discountPercent) / 100)}
              </span>
            </div>

            <button
              disabled={cart.length === 0 || createSaleMutation.isPending}
              onClick={handleCheckout}
              className="w-full h-12 bg-success text-success-foreground rounded-xl font-semibold hover:bg-success/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSaleMutation.isPending ? "جاري المعالجة..." : "إتمام الدفع"}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md flat-card p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground mb-6">
              طريقة الدفع
            </h2>

            {/* Payment Methods */}
            <div className="space-y-3 mb-6">
              <PaymentMethodButton
                icon={DollarSign}
                label="نقدي"
                method="cash"
                selected={selectedPaymentMethod === "cash"}
                onClick={() => setSelectedPaymentMethod("cash")}
              />
              <PaymentMethodButton
                icon={CreditCard}
                label="بطاقة"
                method="card"
                selected={selectedPaymentMethod === "card"}
                onClick={() => setSelectedPaymentMethod("card")}
              />
              <PaymentMethodButton
                icon={Wallet}
                label="آجل (دين على العميل)"
                method="credit"
                selected={selectedPaymentMethod === "credit"}
                onClick={() => setSelectedPaymentMethod("credit")}
                disabled={!selectedCustomer}
              />
            </div>

            {/* Total Summary */}
            <div className="bg-accent rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">المجموع الفرعي</span>
                <span className="text-sm font-medium">{formatCurrency(getTotalAmount())}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">الضريبة (0%)</span>
                <span className="text-sm font-medium">{formatCurrency(0)}</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="font-semibold">الإجمالي</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(getTotalAmount())}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={createSaleMutation.isPending}
                className="flex-1 h-12 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={createSaleMutation.isPending}
                className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createSaleMutation.isPending ? "جاري المعالجة..." : "تأكيد الدفع"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Dialog */}
      <SelectCustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={(customer) => {
          setSelectedCustomer(customer)
          setShowCustomerDialog(false)
        }}
        selectedCustomerId={selectedCustomer?.id}
      />
    </div>
  )
}

interface PaymentMethodButtonProps {
  icon: typeof DollarSign
  label: string
  method: PaymentMethod
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

function PaymentMethodButton({ icon: Icon, label, selected, onClick, disabled }: PaymentMethodButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={cn(
        "text-sm font-medium",
        selected ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </button>
  )
}
