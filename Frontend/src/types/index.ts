export interface User {
  id: number
  name: string
  email: string
  role: 'مدير' | 'محاسب' | 'مندوب'
  is_active: boolean
  warehouse_id?: number
  warehouse?: Warehouse
  created_at: string
  updated_at: string
}

export interface Warehouse {
  id: number
  name: string
  type: 'رئيسي' | 'فرعي'
  representative_id?: number
  representative?: User
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  name: string
  barcode?: string
  price: number
  cost_price?: number
  stock: number
  reorder_level: number
  warehouse_id: number
  warehouse?: Warehouse
  supplier_id?: number
  supplier?: Supplier
  category?: string | { id: number; name: string; nameEn?: string }
  description?: string
  image_path?: string
  production_date?: string
  expiry_date?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: number
  name: string
  phone: string
  status: 'pending' | 'approved'
  added_by: number
  is_vip: boolean
  vip_color?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Supplier {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  balance: number
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  order_number: string
  user_id: number
  user?: User
  customer_id: number
  customer?: Customer
  warehouse_id: number
  warehouse?: Warehouse
  total_amount: number
  tax_amount: number
  payment_method: 'cash' | 'card' | 'credit'
  status: 'completed' | 'cancelled' | 'refunded'
  items?: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product?: Product
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_sales: number
  total_orders: number
  total_products: number
  active_customers: number
  sales_change: number
  orders_change: number
  products_need_reorder: number
  new_customers_this_week: number
  recent_sales: Order[]
  top_products: Array<{
    product: Product
    quantity: number
    revenue: number
    percentage: number
  }>
}

export interface SalesReturn {
  id: number
  order_id: number
  order?: Order
  product_id: number
  product?: Product
  quantity: number
  refund_amount: number
  refund_method: 'cash' | 'credit'
  reason: string
  return_type: 'single' | 'full_invoice'
  created_at: string
  updated_at: string
}

export interface DamagedItem {
  id: number
  product_id: number
  product?: Product
  warehouse_id: number
  warehouse?: Warehouse
  quantity: number
  loss_amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reported_by: number
  reporter?: User
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  title: string
  amount: number
  category: 'general' | 'car' | 'rent' | 'services' | 'salary' | 'other'
  date: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: number
  name: string
  position: string
  phone: string
  salary: number
  start_date: string
  end_date?: string
  termination_reason?: string
  status: 'active' | 'terminated'
  created_at: string
  updated_at: string
}

export interface PurchaseInvoice {
  id: number
  invoice_number: string
  supplier_id: number
  supplier?: Supplier
  invoice_date: string
  total_amount: number
  payment_status: 'paid' | 'partial' | 'unpaid'
  remaining_amount: number
  details?: PurchaseInvoiceDetail[]
  created_at: string
  updated_at: string
}

export interface PurchaseInvoiceDetail {
  id: number
  purchase_invoice_id: number
  product_id: number
  product?: Product
  quantity: number
  unit_price: number
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: number
  user_id: number
  user?: User
  activity_type: string
  description: string
  details?: Record<string, any>
  reference_type?: string
  reference_id?: number
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}
