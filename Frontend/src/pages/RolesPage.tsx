import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plus, Loader2, Shield, Trash2, Edit, X, Check, Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"
import {
  MENU_SECTIONS,
  ALL_MENU_KEYS,
  type MenuSectionKey,
} from "@/lib/menuAccess"

const roleApi = {
  getAll: () => api.get("/roles").then((r) => r.data),
  getPermissions: () => api.get("/roles/permissions").then((r) => r.data),
  create: (data: any) => api.post("/roles", data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/roles/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/roles/${id}`).then((r) => r.data),
}

const MODULE_LABELS: Record<string, string> = {
  users: "المستخدمين",
  products: "المنتجات",
  sales: "المبيعات",
  customers: "العملاء",
  suppliers: "الموردين",
  inventory: "المخزون",
  reports: "التقارير",
  settings: "الإعدادات",
  system: "النظام",
  other: "أخرى",
}

type RoleForm = {
  displayName: string
  name: string
  description: string
  permissionIds: number[]
  menuAccess: MenuSectionKey[]
}

const emptyForm = (): RoleForm => ({
  displayName: "",
  name: "",
  description: "",
  permissionIds: [],
  menuAccess: ["dashboard", "customers"],
})

export default function RolesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<RoleForm>(emptyForm())

  const { data: rolesRes, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: roleApi.getAll,
  })
  const { data: permsRes } = useQuery({
    queryKey: ["roles", "permissions"],
    queryFn: roleApi.getPermissions,
  })

  const roles: any[] = rolesRes?.data || []
  const permissions: any[] = permsRes?.data || []
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = permsRes?.grouped || {}
    if (Object.keys(g).length) return g
    const fallback: Record<string, any[]> = {}
    for (const p of permissions) {
      const mod = p.module || "other"
      if (!fallback[mod]) fallback[mod] = []
      fallback[mod].push(p)
    }
    return fallback
  }, [permsRes, permissions])

  const createMutation = useMutation({
    mutationFn: roleApi.create,
    onSuccess: () => {
      toast.success("تم إنشاء الدور")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      queryClient.invalidateQueries({ queryKey: ["users", "roles"] })
      closeForm()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الإنشاء"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => roleApi.update(id, data),
    onSuccess: () => {
      toast.success("تم تحديث الدور")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      queryClient.invalidateQueries({ queryKey: ["users", "roles"] })
      closeForm()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل التحديث"),
  })

  const deleteMutation = useMutation({
    mutationFn: roleApi.delete,
    onSuccess: () => {
      toast.success("تم حذف الدور")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      queryClient.invalidateQueries({ queryKey: ["users", "roles"] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "فشل الحذف"),
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  const openEdit = (role: any) => {
    setEditingId(role.id)
    setForm({
      displayName: role.displayName || "",
      name: role.name || "",
      description: role.description || "",
      permissionIds: (role.permissions || []).map((p: any) => p.id),
      menuAccess: (Array.isArray(role.menuAccess) ? role.menuAccess : []).filter((k: string) =>
        ALL_MENU_KEYS.includes(k as MenuSectionKey)
      ),
    })
    setShowForm(true)
  }

  const togglePerm = (id: number) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter((x) => x !== id)
        : [...prev.permissionIds, id],
    }))
  }

  const toggleMenu = (key: MenuSectionKey) => {
    setForm((prev) => ({
      ...prev,
      menuAccess: prev.menuAccess.includes(key)
        ? prev.menuAccess.filter((k) => k !== key)
        : [...prev.menuAccess, key],
    }))
  }

  const submit = () => {
    if (!form.displayName.trim()) return toast.error("اسم الدور مطلوب")
    if (!form.menuAccess.length) return toast.error("حدد قسماً واحداً على الأقل")

    const payload: any = {
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      permissionIds: form.permissionIds,
      menuAccess: form.menuAccess,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      if (form.name.trim()) payload.name = form.name.trim().toLowerCase()
      createMutation.mutate(payload)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">أنواع المستخدمين (الأدوار)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إنشاء أدوار مخصصة وتحديد الصلاحيات وأقسام القائمة الافتراضية
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" /> دور جديد
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
            لا توجد أدوار
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["الدور", "المعرف", "المستخدمون", "الصلاحيات", "أقسام القائمة", "النوع", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-right font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <div className="font-medium">{role.displayName}</div>
                    {role.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{role.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{role.name}</td>
                  <td className="px-3 py-3">{role.userCount ?? 0}</td>
                  <td className="px-3 py-3">{(role.permissions || []).length}</td>
                  <td className="px-3 py-3">{(role.menuAccess || []).length}</td>
                  <td className="px-3 py-3">
                    {role.isSystem ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                        <Lock className="w-3 h-3" /> أساسي
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary">مخصص</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(role)}
                        className="p-2 hover:bg-muted rounded-lg"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={() => {
                            if (confirm(`حذف الدور «${role.displayName}»؟`)) {
                              deleteMutation.mutate(role.id)
                            }
                          }}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? "تعديل الدور" : "إنشاء دور مخصص"}</h2>
              <button onClick={closeForm} className="p-2 hover:bg-muted rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">الاسم الظاهر *</label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="مثال: مشرف مستودع"
                  className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  المعرف التقني {editingId ? "(ثابت)" : "(اختياري — لاتيني)"}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!!editingId}
                  placeholder="warehouse_supervisor"
                  className="w-full mt-1 h-10 px-3 border rounded-xl bg-background text-sm font-mono disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm resize-none"
              />
            </div>

            <div className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold">أقسام القائمة الافتراضية *</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, menuAccess: [...ALL_MENU_KEYS] }))}
                    className="text-xs px-2 py-1 border rounded-lg hover:bg-muted"
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, menuAccess: [] }))}
                    className="text-xs px-2 py-1 border rounded-lg hover:bg-muted"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {MENU_SECTIONS.map((section) => (
                  <label
                    key={section.key}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.menuAccess.includes(section.key)}
                      onChange={() => toggleMenu(section.key)}
                    />
                    <span>{section.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold">صلاحيات API</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, permissionIds: permissions.map((x) => x.id) }))}
                    className="text-xs px-2 py-1 border rounded-lg hover:bg-muted"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, permissionIds: [] }))}
                    className="text-xs px-2 py-1 border rounded-lg hover:bg-muted"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>
              {Object.entries(grouped).map(([mod, perms]) => (
                <div key={mod}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {MODULE_LABELS[mod] || mod}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer",
                          form.permissionIds.includes(p.id)
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={form.permissionIds.includes(p.id)}
                          onChange={() => togglePerm(p.id)}
                        />
                        <span>{p.displayName || p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              disabled={saving}
              onClick={submit}
              className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? "حفظ التعديلات" : "إنشاء الدور"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
