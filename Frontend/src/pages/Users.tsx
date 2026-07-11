import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Users as UsersIcon,
  UserCheck,
  Shield,
  Mail,
  Phone,
  Building2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn } from "@/lib/utils"
import { userService } from "@/services/api.service"

interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  branch_id?: number
  branch?: {
    id: number
    name: string
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

type RoleFilter = "all" | "admin" | "manager" | "cashier" | "representative"

export default function Users() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch users
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["users", searchTerm, roleFilter, currentPage],
    queryFn: () => userService.getAll({
      search: searchTerm || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
      page: currentPage,
      limit: 50,
    }),
  })

  // Fetch statistics
  const { data: statsResponse } = useQuery({
    queryKey: ["users", "statistics"],
    queryFn: () => userService.getStatistics(),
  })

  // Fetch roles
  const { data: rolesResponse } = useQuery({
    queryKey: ["users", "roles"],
    queryFn: () => userService.getRoles(),
  })

  const users = usersResponse?.data || []
  const stats = statsResponse?.data
  const roles = rolesResponse?.data || []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "مدير النظام",
      manager: "مدير فرع",
      cashier: "كاشير",
      representative: "مندوب",
    }
    return labels[role] || role
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary/10 text-primary"
      case "manager":
        return "bg-success-light text-success"
      case "cashier":
        return "bg-info/10 text-info"
      case "representative":
        return "bg-warning-light text-warning"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={stats?.total || users.length}
          icon={UsersIcon}
          variant="primary"
        />
        <StatCard
          title="نشطين"
          value={stats?.active || users.filter((u: User) => u.is_active).length}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="مديرين"
          value={stats?.admins || users.filter((u: User) => u.role === "admin").length}
          icon={Shield}
          variant="warning"
        />
        <StatCard
          title="كاشيرات"
          value={stats?.cashiers || users.filter((u: User) => u.role === "cashier").length}
          icon={UsersIcon}
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
                placeholder="البحث في المستخدمين..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع الأدوار</option>
            <option value="admin">مدير النظام</option>
            <option value="manager">مدير فرع</option>
            <option value="cashier">كاشير</option>
            <option value="representative">مندوب</option>
          </select>

          {/* Add User */}
          <button className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">إضافة مستخدم</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
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
                    الاسم
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    البريد الإلكتروني
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    رقم الهاتف
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الدور
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الفرع
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    الحالة
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: User) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="font-medium text-foreground">{user.name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {user.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{user.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                          getRoleBadgeColor(user.role)
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {user.branch ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{user.branch.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                          user.is_active
                            ? "bg-success-light text-success"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {user.is_active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <UserActionsMenu
                        userId={user.id}
                        onDelete={() => deleteMutation.mutate(user.id)}
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
  )
}

interface UserActionsMenuProps {
  userId: number
  onDelete: () => void
}

function UserActionsMenu({ userId, onDelete }: UserActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
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
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-48 flat-card p-2 z-20 shadow-flat-lg">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
              تعديل
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
              <Shield className="w-4 h-4" />
              الصلاحيات
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
