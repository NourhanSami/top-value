import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Building2, DollarSign, Printer, Bell, Shield, Database, Palette, Save, Loader2, Mail, Landmark,
} from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import toast from "react-hot-toast"
import { syncSettingsToCache } from "@/lib/settings"

type SettingsTab = "company" | "tax" | "print" | "notifications" | "smtp" | "security" | "backup"

const settingsApi = {
  getAll: () => api.get('/settings').then(r => r.data),
  saveBulk: (settings: { key: string; value: string }[]) => api.post('/settings/bulk', { settings }).then(r => r.data),
}

function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: settingsApi.getAll, staleTime: 10000 })
}

function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.saveBulk,
    onSuccess: (_data, variables) => {
      syncSettingsToCache(variables)
      toast.success("تم حفظ الإعدادات بنجاح — ستظهر التغييرات في الفواتير والمبيعات")
      qc.invalidateQueries({ queryKey: ["settings"] })
    },
    onError: () => toast.error("حدث خطأ أثناء الحفظ"),
  })
}

function getVal(settings: any[], key: string, def = ""): string {
  return settings.find((s: any) => s.key === key)?.value ?? def
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company")
  const { data: settingsRes, isLoading } = useSettings()
  const saveMutation = useSaveSettings()
  const allSettings: any[] = settingsRes?.data || []

  useEffect(() => {
    if (allSettings.length) syncSettingsToCache(allSettings)
  }, [allSettings])

  const tabs = [
    { id: "company" as SettingsTab, label: "معلومات الشركة", icon: Building2 },
    { id: "tax" as SettingsTab, label: "الضرائب", icon: DollarSign },
    { id: "print" as SettingsTab, label: "الطباعة", icon: Printer },
    { id: "notifications" as SettingsTab, label: "الإشعارات", icon: Bell },
    { id: "smtp" as SettingsTab, label: "البريد الإلكتروني", icon: Mail },
    { id: "security" as SettingsTab, label: "الأمان", icon: Shield },
    { id: "backup" as SettingsTab, label: "النسخ الاحتياطي", icon: Database },
  ]

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة إعدادات النظام والتكوين</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-2xl p-2 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all", activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-2xl p-6">
            {activeTab === "company" && <CompanySettings settings={allSettings} onSave={saveMutation.mutate} saving={saveMutation.isPending} />}
            {activeTab === "tax" && <TaxSettings settings={allSettings} onSave={saveMutation.mutate} saving={saveMutation.isPending} />}
            {activeTab === "print" && <PrintSettings settings={allSettings} onSave={saveMutation.mutate} saving={saveMutation.isPending} />}
            {activeTab === "notifications" && <NotificationSettings settings={allSettings} onSave={saveMutation.mutate} saving={saveMutation.isPending} />}
            {activeTab === "smtp" && <SmtpSettings settings={allSettings} onSave={saveMutation.mutate} saving={saveMutation.isPending} />}
            {activeTab === "security" && <SecuritySettings settings={allSettings} onSave={saveMutation.mutate} saving={saveMutation.isPending} />}
            {activeTab === "backup" && <BackupSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Company Settings =====
function CompanySettings({ settings, onSave, saving }: { settings: any[]; onSave: any; saving: boolean }) {
  const [form, setForm] = useState({ company_name: "", company_address: "", company_phone: "", company_email: "", company_tax_number: "", company_commercial_register: "", company_website: "" })
  useEffect(() => {
    setForm({
      company_name: getVal(settings, "company_name", "نظام إدارة المخازن"),
      company_address: getVal(settings, "company_address"),
      company_phone: getVal(settings, "company_phone"),
      company_email: getVal(settings, "company_email"),
      company_tax_number: getVal(settings, "company_tax_number"),
      company_commercial_register: getVal(settings, "company_commercial_register"),
      company_website: getVal(settings, "company_website"),
    })
  }, [settings])

  const handleSave = () => onSave(Object.entries(form).map(([key, value]) => ({ key, value: value as string })))

  return (
    <SettingsSection title="معلومات الشركة" icon={Building2} onSave={handleSave} saving={saving}>
      <Field label="اسم الشركة" required><input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} className={inputCls} /></Field>
      <Field label="العنوان"><input value={form.company_address} onChange={e => setForm({ ...form, company_address: e.target.value })} className={inputCls} placeholder="المدينة، الشارع، رقم المبنى" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="رقم الهاتف"><input value={form.company_phone} onChange={e => setForm({ ...form, company_phone: e.target.value })} className={inputCls} placeholder="+201XXXXXXXXX" /></Field>
        <Field label="البريد الإلكتروني"><input value={form.company_email} onChange={e => setForm({ ...form, company_email: e.target.value })} className={inputCls} placeholder="info@company.com" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الرقم الضريبي"><input value={form.company_tax_number} onChange={e => setForm({ ...form, company_tax_number: e.target.value })} className={inputCls} placeholder="أدخل الرقم الضريبي" /></Field>
        <Field label="السجل التجاري"><input value={form.company_commercial_register} onChange={e => setForm({ ...form, company_commercial_register: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="الموقع الإلكتروني"><input value={form.company_website} onChange={e => setForm({ ...form, company_website: e.target.value })} className={inputCls} placeholder="https://yourcompany.com" /></Field>
    </SettingsSection>
  )
}

// ===== Tax Settings =====
function TaxSettings({ settings, onSave, saving }: { settings: any[]; onSave: any; saving: boolean }) {
  const [form, setForm] = useState({ tax_enabled: "true", tax_rate: "15", tax_name: "ضريبة القيمة المضافة", currency: "SAR" })
  useEffect(() => {
    setForm({
      tax_enabled: getVal(settings, "tax_enabled", "true"),
      tax_rate: getVal(settings, "tax_rate", "15"),
      tax_name: getVal(settings, "tax_name", "ضريبة القيمة المضافة"),
      currency: getVal(settings, "currency", "SAR"),
    })
  }, [settings])

  const handleSave = () => onSave(Object.entries(form).map(([key, value]) => ({ key, value: value as string })))

  return (
    <SettingsSection title="إعدادات الضرائب والعملة" icon={DollarSign} onSave={handleSave} saving={saving}>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div>
          <p className="font-medium">تفعيل الضريبة</p>
          <p className="text-sm text-muted-foreground">تطبيق الضريبة على المبيعات في نقطة البيع</p>
        </div>
        <Toggle checked={form.tax_enabled === "true"} onChange={v => setForm({ ...form, tax_enabled: v ? "true" : "false" })} />
      </div>
      <Field label="اسم الضريبة"><input value={form.tax_name} onChange={e => setForm({ ...form, tax_name: e.target.value })} className={inputCls} /></Field>
      <Field label="نسبة الضريبة (%)"><input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} className={inputCls} /></Field>
      <Field label="العملة">
        <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={inputCls}>
          <option value="SAR">ر.س — ريال سعودي</option>
          <option value="EGP">ج.م — جنيه مصري</option>
          <option value="AED">د.إ — درهم إماراتي</option>
          <option value="USD">$ — دولار أمريكي</option>
        </select>
      </Field>
    </SettingsSection>
  )
}

// ===== Print Settings =====
function PrintSettings({ settings, onSave, saving }: { settings: any[]; onSave: any; saving: boolean }) {
  const [form, setForm] = useState({ paper_size: "a4", auto_print: "false", show_logo: "true", print_footer: "" })
  useEffect(() => {
    setForm({
      paper_size: getVal(settings, "paper_size", "a4"),
      auto_print: getVal(settings, "auto_print", "false"),
      show_logo: getVal(settings, "show_logo", "true"),
      print_footer: getVal(settings, "print_footer"),
    })
  }, [settings])

  const handleSave = () => onSave(Object.entries(form).map(([key, value]) => ({ key, value: value as string })))

  return (
    <SettingsSection title="إعدادات الطباعة" icon={Printer} onSave={handleSave} saving={saving}>
      <Field label="حجم الورق">
        <select value={form.paper_size} onChange={e => setForm({ ...form, paper_size: e.target.value })} className={inputCls}>
          <option value="a4">A4</option>
          <option value="thermal80">حراري 80mm</option>
          <option value="thermal58">حراري 58mm</option>
        </select>
      </Field>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div><p className="font-medium">طباعة تلقائية</p><p className="text-sm text-muted-foreground">طباعة الفاتورة تلقائياً بعد البيع</p></div>
        <Toggle checked={form.auto_print === "true"} onChange={v => setForm({ ...form, auto_print: v ? "true" : "false" })} />
      </div>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div><p className="font-medium">عرض الشعار</p><p className="text-sm text-muted-foreground">إظهار شعار الشركة في الفواتير</p></div>
        <Toggle checked={form.show_logo === "true"} onChange={v => setForm({ ...form, show_logo: v ? "true" : "false" })} />
      </div>
      <Field label="نص تذييل الفاتورة"><input value={form.print_footer} onChange={e => setForm({ ...form, print_footer: e.target.value })} className={inputCls} placeholder="شكراً لتعاملكم معنا" /></Field>
    </SettingsSection>
  )
}

// ===== Notification Settings =====
function NotificationSettings({ settings, onSave, saving }: { settings: any[]; onSave: any; saving: boolean }) {
  const [form, setForm] = useState({ notify_low_stock: "true", low_stock_threshold: "10", notify_overdue_payments: "true" })
  useEffect(() => {
    setForm({
      notify_low_stock: getVal(settings, "notify_low_stock", "true"),
      low_stock_threshold: getVal(settings, "low_stock_threshold", "10"),
      notify_overdue_payments: getVal(settings, "notify_overdue_payments", "true"),
    })
  }, [settings])

  const handleSave = () => onSave(Object.entries(form).map(([key, value]) => ({ key, value: value as string })))

  return (
    <SettingsSection title="إعدادات الإشعارات" icon={Bell} onSave={handleSave} saving={saving}>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div><p className="font-medium">تنبيهات المخزون المنخفض</p><p className="text-sm text-muted-foreground">إشعار عند انخفاض كمية المنتج</p></div>
        <Toggle checked={form.notify_low_stock === "true"} onChange={v => setForm({ ...form, notify_low_stock: v ? "true" : "false" })} />
      </div>
      <Field label="حد المخزون المنخفض (وحدة)"><input type="number" min="1" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} className={inputCls} /></Field>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div><p className="font-medium">تنبيهات الأقساط المتأخرة</p><p className="text-sm text-muted-foreground">إشعار عند تأخر دفعة مستحقة</p></div>
        <Toggle checked={form.notify_overdue_payments === "true"} onChange={v => setForm({ ...form, notify_overdue_payments: v ? "true" : "false" })} />
      </div>
    </SettingsSection>
  )
}

// ===== SMTP Settings =====
function SmtpSettings({ settings, onSave, saving }: { settings: any[]; onSave: any; saving: boolean }) {
  const [form, setForm] = useState({ smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "", smtp_from_name: "", smtp_from_email: "" })
  useEffect(() => {
    setForm({
      smtp_host: getVal(settings, "smtp_host"),
      smtp_port: getVal(settings, "smtp_port", "587"),
      smtp_user: getVal(settings, "smtp_user"),
      smtp_pass: getVal(settings, "smtp_pass"),
      smtp_from_name: getVal(settings, "smtp_from_name"),
      smtp_from_email: getVal(settings, "smtp_from_email"),
    })
  }, [settings])

  const handleSave = () => onSave(Object.entries(form).map(([key, value]) => ({ key, value: value as string })))

  return (
    <SettingsSection title="إعدادات البريد الإلكتروني (SMTP)" icon={Mail} onSave={handleSave} saving={saving}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="SMTP Host"><input value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} className={inputCls} placeholder="smtp.gmail.com" /></Field>
        <Field label="SMTP Port"><input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: e.target.value })} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="اسم المرسل"><input value={form.smtp_from_name} onChange={e => setForm({ ...form, smtp_from_name: e.target.value })} className={inputCls} /></Field>
        <Field label="بريد المرسل"><input type="email" value={form.smtp_from_email} onChange={e => setForm({ ...form, smtp_from_email: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="اسم المستخدم"><input value={form.smtp_user} onChange={e => setForm({ ...form, smtp_user: e.target.value })} className={inputCls} /></Field>
      <Field label="كلمة المرور"><input type="password" value={form.smtp_pass} onChange={e => setForm({ ...form, smtp_pass: e.target.value })} className={inputCls} /></Field>
    </SettingsSection>
  )
}

// ===== Security Settings =====
function SecuritySettings({ settings, onSave, saving }: { settings: any[]; onSave: any; saving: boolean }) {
  const [form, setForm] = useState({ session_timeout: "480", require_2fa: "false", max_login_attempts: "5" })
  useEffect(() => {
    setForm({
      session_timeout: getVal(settings, "session_timeout", "480"),
      require_2fa: getVal(settings, "require_2fa", "false"),
      max_login_attempts: getVal(settings, "max_login_attempts", "5"),
    })
  }, [settings])

  const handleSave = () => onSave(Object.entries(form).map(([key, value]) => ({ key, value: value as string })))

  return (
    <SettingsSection title="إعدادات الأمان" icon={Shield} onSave={handleSave} saving={saving}>
      <Field label="مدة انتهاء الجلسة (دقيقة)"><input type="number" min="5" value={form.session_timeout} onChange={e => setForm({ ...form, session_timeout: e.target.value })} className={inputCls} /></Field>
      <Field label="الحد الأقصى لمحاولات تسجيل الدخول"><input type="number" min="1" value={form.max_login_attempts} onChange={e => setForm({ ...form, max_login_attempts: e.target.value })} className={inputCls} /></Field>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div><p className="font-medium">المصادقة الثنائية (2FA)</p><p className="text-sm text-muted-foreground">طلب رمز تحقق إضافي عند الدخول</p></div>
        <Toggle checked={form.require_2fa === "true"} onChange={v => setForm({ ...form, require_2fa: v ? "true" : "false" })} />
      </div>
    </SettingsSection>
  )
}

// ===== Backup Settings =====
function BackupSettings() {
  const handleManualBackup = async () => {
    try {
      const res = await api.get("/settings/backup", { responseType: "blob" })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.db`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("تم تحميل النسخة الاحتياطية")
    } catch {
      toast.error("تعذر إنشاء النسخة الاحتياطية")
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">النسخ الاحتياطي</h3>
      </div>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        يمكنك تنزيل نسخة من قاعدة البيانات للاحتفاظ بها محلياً.
      </div>
      <button onClick={handleManualBackup} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90">
        <Database className="w-4 h-4" />
        تنزيل نسخة احتياطية
      </button>
    </div>
  )
}

// ===== Shared Components =====
function SettingsSection({ title, icon: Icon, children, onSave, saving }: { title: string; icon: any; children: React.ReactNode; onSave: () => void; saving: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {children}
      <div className="pt-4">
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </button>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}{required && <span className="text-destructive mr-1">*</span>}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn("relative w-11 h-6 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
    >
      <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", checked ? "translate-x-5 left-0.5" : "left-0.5")} />
    </button>
  )
}

const inputCls = "w-full h-10 px-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
