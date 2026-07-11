import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { userService } from "@/services/api.service"

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
    role: "employee",
    phone: "",
    branchId: "",
    isActive: true,
  })

  const { data: userResponse } = useQuery({
    queryKey: ["users", userId],
    queryFn: () => userService.getById(userId!),
    enabled: mode === "edit" && !!userId,
  })

  useEffect(() => {
    if (mode === "edit" && userResponse?.data) {
      const user = userResponse.data
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: user.role || "employee",
        phone: user.phone || "",
        branchId: user.branchId || "",
        isActive: user.isActive !== false,
      })
    }
  }, [userResponse, mode])

  const saveMutation = useMutation({
    mutationFn: (data: any) => mode === "create" ? userService.create(data) : userService.update(userId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...formData }
    if (mode === "edit" && !data.password) delete (data as any).password
    saveMutation.mutate(data)
  }

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title={mode === "create" ? "إضافة مستخدم" : "تعديل مستخدم"} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-2">الاسم *</label>
            <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2 border border-border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-2">البريد الإلكتروني *</label>
            <input type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-3 py-2 border border-border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-2">كلمة المرور {mode === "create" && "*"}</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required={mode === "create"} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-2">رقم الهاتف</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-2">الدور *</label>
            <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg">
              <option value="admin">مدير</option><option value="accountant">محاسب</option><option value="employee">موظف</option></select></div>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} /><span className="text-sm">نشط</span></label>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">إلغاء</button>
          <button type="submit" disabled={saveMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>جاري الحفظ...</span></> : <><Save className="w-4 h-4" /><span>حفظ</span></>}</button>
        </div>
      </form>
    </BaseDialog>
  )
}
