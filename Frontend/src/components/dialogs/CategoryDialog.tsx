import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save, Loader2 } from "lucide-react"
import BaseDialog from "./BaseDialog"
import { categoryService } from "@/services/api.service"

interface CategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  categoryId?: number
  mode: "create" | "edit"
}

export default function CategoryDialog({ isOpen, onClose, categoryId, mode }: CategoryDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ name: "", nameEn: "", description: "" })

  const { data: categoryResponse } = useQuery({
    queryKey: ["categories", categoryId],
    queryFn: () => categoryService.getById(categoryId!),
    enabled: mode === "edit" && !!categoryId,
  })

  useEffect(() => {
    if (mode === "edit" && categoryResponse?.data) {
      const cat = categoryResponse.data
      setFormData({ name: cat.name || "", nameEn: cat.nameEn || "", description: cat.description || "" })
    }
  }, [categoryResponse, mode])

  const saveMutation = useMutation({
    mutationFn: (data: any) => mode === "create" ? categoryService.create(data) : categoryService.update(categoryId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <BaseDialog isOpen={isOpen} onClose={onClose} title={mode === "create" ? "إضافة تصنيف" : "تعديل تصنيف"} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium mb-2">اسم التصنيف *</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
        <div><label className="block text-sm font-medium mb-2">الاسم بالإنجليزية</label>
          <input type="text" value={formData.nameEn} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
        <div><label className="block text-sm font-medium mb-2">الوصف</label>
          <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded-lg" /></div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">إلغاء</button>
          <button type="submit" disabled={saveMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>جاري الحفظ...</span></> : <><Save className="w-4 h-4" /><span>حفظ</span></>}</button>
        </div>
      </form>
    </BaseDialog>
  )
}
