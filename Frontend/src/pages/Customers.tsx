import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Star,
  X,
  Loader2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatCurrency } from "@/lib/utils"
import { customerService } from "@/services/api.service"
import toast from "react-hot-toast"
import type { Customer } from "@/types"

export default function Customers() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", address: "", creditLimit: "" })
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "", customerTier: "bronze", isActive: true })

  // Fetch customers
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ["customers", searchTerm, activeFilter, currentPage],
    queryFn: () => customerService.getAll({
      search: searchTerm || undefined,
      isActive: activeFilter !== "all" ? activeFilter : undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["customers", "statistics"],
    queryFn: () => customerService.getStatistics(),
  })

  const customers = customersResponse?.data || []
  const stats = statsResponse?.data

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })

  // Add mutation
  const addMutation = useMutation({
    mutationFn: (data: any) => customerService.create(data),
    onSuccess: () => {
      toast.success("تم إضافة العميل بنجاح")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setShowAddDialog(false)
      setAddForm({ name: "", phone: "", email: "", address: "", creditLimit: "" })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إضافة العميل")
    }
  })

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => customerService.update(id, data),
    onSuccess: () => {
      toast.success("تم تحديث بيانات العميل")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setEditingCustomer(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء التحديث")
    }
  })

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      notes: customer.notes || "",
      customerTier: customer.customerTier,
      isActive: customer.isActive,
    })
  }

  const filteredCustomers = customers

  return (
    <>
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي العملاء"
          value={stats?.total || customers.length}
          icon={UsersIcon}
          variant="primary"
        />
        <StatCard
          title="عملاء معتمدين"
          value={stats?.approved || customers.filter((c: Customer) => c.isActive).length}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="غير نشطين"
          value={stats?.pending || customers.filter((c: Customer) => !c.isActive).length}
          icon={UserX}
          variant="warning"
        />
        <StatCard
          title="عملاء VIP"
          value={stats?.vip || customers.filter((c: Customer) => c.customerTier === 'gold' || c.customerTier === 'platinum').length}
          icon={Star}
          variant="info"
        />
      </div>

      {/* Toolbar */}
      <div className="flat-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث في العملاء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeFilter === "all" ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              الكل
            </button>
            <button
              onClick={() => setActiveFilter("true")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeFilter === "true" ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              نشط
            </button>
            <button
              onClick={() => setActiveFilter("false")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeFilter === "false" ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              غير نشط
            </button>
          </div>

          {/* Add Customer */}
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة عميل</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    اسم العميل
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    رقم الهاتف
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الحالة
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    VIP
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    تاريخ التسجيل
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer: Customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium text-foreground">{customer.name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "inline-flex px-2 py-1 rounded-md text-xs font-medium",
                          customer.isActive
                            ? "bg-success-light text-success"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {customer.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {(customer.customerTier === 'gold' || customer.customerTier === 'platinum') && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-warning fill-warning" />
                          <span className="text-xs font-medium text-warning capitalize">{customer.customerTier === 'gold' ? 'ذهبي' : 'بلاتيني'}</span>
                        </div>
                      )}
                      {customer.customerTier === 'silver' && (
                        <span className="text-xs text-muted-foreground">فضي</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("ar-EG") : "—"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <CustomerActionsMenu
                        customer={customer}
                        onDelete={() => deleteMutation.mutate(customer.id)}
                        onEdit={() => openEdit(customer)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* Edit Customer Dialog */}
    {editingCustomer && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">تعديل بيانات العميل</h2>
            <button onClick={() => setEditingCustomer(null)} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">الاسم *</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">الهاتف</label>
              <input type="text" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني</label>
              <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">الدرجة</label>
              <select value={editForm.customerTier} onChange={e => setEditForm(f => ({ ...f, customerTier: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="bronze">برونزي</option>
                <option value="silver">فضي</option>
                <option value="gold">ذهبي (VIP)</option>
                <option value="platinum">بلاتيني (VIP)</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isActive" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-border accent-primary" />
              <label htmlFor="isActive" className="text-sm font-medium text-foreground">عميل نشط</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
              <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                if (!editForm.name.trim()) { toast.error("الاسم مطلوب"); return }
                editMutation.mutate({ id: editingCustomer.id, data: { name: editForm.name, phone: editForm.phone || undefined, email: editForm.email || undefined, notes: editForm.notes || undefined, customerTier: editForm.customerTier, isActive: editForm.isActive } })
              }}
              disabled={editMutation.isPending}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ التعديلات
            </button>
            <button onClick={() => setEditingCustomer(null)} className="flex-1 h-10 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80">إلغاء</button>
          </div>
        </div>
      </div>
    )}
    {showAddDialog && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">إضافة عميل جديد</h2>
            <button onClick={() => setShowAddDialog(false)} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">اسم العميل *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="الاسم الكامل"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={addForm.phone}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="05xxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">العنوان</label>
              <input
                type="text"
                value={addForm.address}
                onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="المدينة، الحي"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">حد الائتمان</label>
              <input
                type="number"
                value={addForm.creditLimit}
                onChange={e => setAddForm(f => ({ ...f, creditLimit: e.target.value }))}
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                if (!addForm.name.trim()) { toast.error("اسم العميل مطلوب"); return }
                addMutation.mutate({
                  name: addForm.name,
                  phone: addForm.phone || undefined,
                  email: addForm.email || undefined,
                  address: addForm.address || undefined,
                  creditLimit: addForm.creditLimit ? parseFloat(addForm.creditLimit) : undefined,
                })
              }}
              disabled={addMutation.isPending}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ
            </button>
            <button
              onClick={() => setShowAddDialog(false)}
              className="flex-1 h-10 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

interface CustomerActionsMenuProps {
  customer: Customer
  onDelete: () => void
  onEdit: () => void
}

function CustomerActionsMenu({ onDelete, onEdit }: CustomerActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا العميل؟")) {
      onDelete()
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-muted rounded transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 w-48 flat-card p-2 z-20 shadow-flat-lg">
            <button
              onClick={() => { onEdit(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              تعديل
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>
        </>
      )}
    </div>
  )
}
