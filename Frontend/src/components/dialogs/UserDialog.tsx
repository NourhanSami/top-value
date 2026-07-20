import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { userService, branchService } from "@/services/api.service"
import toast from "react-hot-toast"

interface UserDialogProps {
  isOpen: boolean
  onClose: () => void
  userId?: number
  mode: "create" | "edit"
}

export default function UserDialog({ isOpen, onClose, userId, mode }: UserDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    branchId: "",
    roleId: "",
    isActive: true,
  })

  const { data: rolesRes } = useQuery({
    queryKey: ["users", "roles"],
    queryFn: () => userService.getRoles(),
    enabled: isOpen,
  })
  const { data: branchesRes } = useQuery({
    queryKey: ["branches-list"],
    queryFn: () => branchService.getAll(),
    enabled: isOpen,
  })

  const roles: any[] = rolesRes?.data || []
  const branches: any[] = branchesRes?.data || []

  const { data: userResponse } = useQuery({
    queryKey: ["users", userId],
    queryFn: () => userService.getById(userId!),
    enabled: mode === "edit" && !!userId && isOpen,
  })

  useEffect(() => {
    if (!isOpen) return
    if (mode === "edit" && userResponse?.data) {
      const user = userResponse.data
      const roleList = user.roles || []
      const firstRole = roleList[0]?.role || roleList[0]
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        phone: user.phone || "",
        branchId: user.branchId ? String(user.branchId) : "",
        roleId: firstRole?.id ? String(firstRole.id) : "",
        isActive: user.isActive !== false,
      })
    } else if (mode === "create") {
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        branchId: branches[0] ? String(branches[0].id) : "",
        roleId: roles.find((r) => r.name === "employee")?.id
          ? String(roles.find((r) => r.name === "employee").id)
          : roles[0]
            ? String(roles[0].id)
            : "",
        isActive: true,
      })
    }
  }, [isOpen, mode, userResponse, roles.length, branches.length])

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      mode === "create" ? userService.create(data) : userService.update(userId!, data),
    onSuccess: () => {
      toast.success(mode === "create" ? "تم إضافة المستخدم" : "تم تحديث المستخدم")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحفظ"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) return toast.error("الاسم والبريد مطلوبان")
    if (mode === "create" && formData.password.length < 8) return toast.error("كلمة المرور 8 أحرف على الأقل")
    if (!formData.roleId) return toast.error("اختر الدور")

    const payload: any = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone || undefined,
      branchId: formData.branchId ? parseInt(formData.branchId) : undefined,
      roleIds: [parseInt(formData.roleId)],
      isActive: formData.isActive,
    }
    if (formData.password) payload.password = formData.password

    saveMutation.mutate(payload)
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "إضافة مستخدم" : "تعديل مستخدم"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">الاسم *</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">البريد الإلكتروني *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              كلمة المرور {mode === "create" ? "*" : "(اتركها فارغة لعدم التغيير)"}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={mode === "create"}
              minLength={mode === "create" ? 8 : undefined}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">رقم الهاتف</label>
            <input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">الدور *</label>
            <select
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            >
              <option value="">اختر الدور</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.displayName || r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">الفرع</label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            >
              <option value="">بدون فرع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          <span className="text-sm">حساب نشط</span>
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl text-sm">إلغاء</button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </button>
        </div>
      </form>
    </BaseDialog>
  )
}
