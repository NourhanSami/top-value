import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Upload, Trash2, FileText, Image, File, Download, Loader2 } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"

interface Attachment {
  id: number
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  uploadedBy: number
  uploader?: { id: number; name: string }
  createdAt: string
}

interface FileUploadProps {
  entityType: string
  entityId: number
  compact?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image
  if (fileType === "application/pdf") return FileText
  return File
}

export function FileUpload({ entityType, entityId, compact = false }: FileUploadProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: res, isLoading } = useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: () => api.get('/attachments', { params: { entityType, entityId } }).then(r => r.data),
    enabled: !!entityId,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/attachments/${id}`).then(r => r.data),
    onSuccess: () => { toast.success("تم حذف المرفق"); queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] }) },
    onError: () => toast.error("خطأ أثناء الحذف"),
  })

  const attachments: Attachment[] = res?.data || []

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("حجم الملف يجب أن يكون أقل من 10 MB"); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("entityType", entityType)
      formData.append("entityId", String(entityId))
      await api.post("/attachments", formData, { headers: { "Content-Type": "multipart/form-data" } })
      toast.success("تم رفع الملف بنجاح")
      queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] })
    } catch (e: any) {
      toast.error(e.response?.data?.message || "خطأ أثناء الرفع")
    } finally { setUploading(false) }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) Array.from(files).forEach(uploadFile)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files) Array.from(files).forEach(uploadFile)
  }

  const getFileUrl = (filePath: string) => `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${filePath}`

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">المرفقات ({attachments.length})</h4>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
          compact && "p-3"
        )}
      >
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">جاري الرفع...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{compact ? "رفع ملف" : "اسحب الملفات هنا أو انقر للاختيار"}</span>
          </div>
        )}
      </div>

      {/* Attachments List */}
      {isLoading ? (
        <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" /></div>
      ) : attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map(att => {
            const Icon = getFileIcon(att.fileType)
            return (
              <div key={att.id} className="flex items-center gap-3 p-2 border border-border rounded-xl hover:bg-muted/30 transition-colors group">
                <div className={cn("p-1.5 rounded-lg", att.fileType.startsWith("image/") ? "bg-blue-100" : att.fileType === "application/pdf" ? "bg-red-100" : "bg-gray-100")}>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)} · {formatDate(att.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={getFileUrl(att.filePath)} target="_blank" rel="noopener noreferrer" download className="p-1.5 hover:bg-muted rounded-lg" title="تحميل">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                  <button onClick={() => deleteMutation.mutate(att.id)} className="p-1.5 hover:bg-red-100 rounded-lg" title="حذف">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : !compact && (
        <p className="text-sm text-muted-foreground text-center py-2">لا توجد مرفقات</p>
      )}
    </div>
  )
}
