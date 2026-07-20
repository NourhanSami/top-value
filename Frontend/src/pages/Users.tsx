import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search, Plus, MoreVertical, Edit, Trash2, Users as UsersIcon,
  UserCheck, Shield, Mail, Building2, Loader2,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn } from "@/lib/utils"
import { userService } from "@/services/api.service"
import { UserDialog } from "@/components/dialogs"
import toast from "react-hot-toast"

function getPrimaryRole(user: any) {
  const roles = user.roles || []
  if (!roles.length) return { name: "", displayName: "بدون دور" }
  return roles[0]
}

function roleBadgeClass(roleName: string) {
  switch (roleName) {
    case "admin": return "bg-primary/10 text-primary"
    case "manager": return "bg-success-light text-success"
    case "cashier": return "bg-info/10 text-info"
    case "employee": return "bg-warning-light text-warning"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function Users() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | undefined>()
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")

  const { data: rolesResponse } = useQuery({
    queryKey: ["users", "roles"],
    queryFn: () => userService.getRoles(),
  })
  const roles: any[] = rolesResponse?.data || []

  const selectedRole = roles.find((r) => r.name === roleFilter)

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["users", searchTerm, roleFilter, statusFilter, currentPage],
    queryFn: () =>
      userService.getAll({
        search: searchTerm || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        roleId: selectedRole?.id,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active" ? "true" : "false",
        page: currentPage,
        limit: 50,
      }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ["users", "statistics"],
    queryFn: () => userService.getStatistics(),
  })

  const users: any[] = usersResponse?.data || []
  const pagination = usersResponse?.pagination
  const stats = statsResponse?.data

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      toast.success("تم حذف المستخدم")
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحذف"),
  })

  const openCreate = () => {
    setEditingUserId(undefined)
    setDialogMode("create")
    setDialogOpen(true)
  }

  const openEdit = (id: number) => {
    setEditingUserId(id)
    setDialogMode("edit")
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المستخدمين</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة حسابات الدخول والأدوار</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المستخدمين" value={Number(stats?.total ?? users.length)} icon={UsersIcon} variant="primary" />
        <StatCard title="نشطين" value={Number(stats?.active ?? 0)} icon={UserCheck} variant="success" />
        <StatCard title="مديرين" value={Number(stats?.admins ?? 0)} icon={Shield} variant="warning" />
        <StatCard title="كاشيرات" value={Number(stats?.cashiers ?? 0)} icon={UsersIcon} variant="info" />
      </div>

      <div className="flat-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث بالاسم أو البريد أو الهاتف..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1) }}
            className="h-10 px-4 bg-card border border-border rounded-xl text-sm focus:outline-none"
          >
            <option value="all">جميع الأدوار</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>{r.displayName || r.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className="h-10 px-4 bg-card border border-border rounded-xl text-sm focus:outline-none"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> إضافة مستخدم
          </button>
        </div>
      </div>

      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["الاسم", "البريد الإلكتروني", "رقم الهاتف", "الدور", "الفرع", "الحالة", "إجراءات"].map((h) => (
                    <th key={h} className="text-right text-sm font-medium text-muted-foreground py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = getPrimaryRole(user)
                  const active = user.isActive !== false && user.is_active !== false
                  return (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-4 px-4 font-medium">{user.name}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">{user.phone || "—"}</td>
                      <td className="py-4 px-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium", roleBadgeClass(role.name))}>
                          <Shield className="w-3.5 h-3.5" />
                          {role.displayName || role.name || "بدون دور"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {user.branch ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {user.branch.name}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                          active ? "bg-success-light text-success" : "bg-destructive/10 text-destructive"
                        )}>
                          {active ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <UserActionsMenu
                          onEdit={() => openEdit(user.id)}
                          onDelete={() => {
                            if (window.confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
                              deleteMutation.mutate(user.id)
                            }
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">السابق</button>
            <span className="px-3 py-1 text-sm">{currentPage} / {pagination.totalPages}</span>
            <button disabled={currentPage >= pagination.totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40">التالي</button>
          </div>
        )}
      </div>

      <UserDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={editingUserId}
        mode={dialogMode}
      />
    </div>
  )
}

function UserActionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      let left = rect.left
      let top = rect.bottom + 4
      if (left + 192 > window.innerWidth) left = rect.right - 192
      if (top + 120 > window.innerHeight) top = rect.top - 120
      setPos({ top: Math.max(8, top), left: Math.max(8, left) })
    }
    setIsOpen((v) => !v)
  }

  useEffect(() => {
    if (!isOpen) return
    const close = () => setIsOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [isOpen])

  return (
    <>
      <button ref={btnRef} onClick={openMenu} className="p-1 hover:bg-muted rounded">
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="fixed z-[101] w-48 bg-card border border-border rounded-xl p-2 shadow-xl" style={{ top: pos.top, left: pos.left }}>
            <button onClick={() => { onEdit(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg">
              <Edit className="w-4 h-4" /> تعديل
            </button>
            <button onClick={() => { onDelete(); setIsOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" /> حذف
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
