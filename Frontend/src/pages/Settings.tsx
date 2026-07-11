import { useState } from "react"
import {
  Building2,
  DollarSign,
  Printer,
  Bell,
  Shield,
  Database,
  Palette,
  Save,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SettingsTab = "company" | "tax" | "print" | "notifications" | "security" | "backup" | "appearance"

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company")
  const [hasChanges, setHasChanges] = useState(false)

  const tabs = [
    { id: "company" as SettingsTab, label: "معلومات الشركة", icon: Building2 },
    { id: "tax" as SettingsTab, label: "الضرائب", icon: DollarSign },
    { id: "print" as SettingsTab, label: "الطباعة", icon: Printer },
    { id: "notifications" as SettingsTab, label: "الإشعارات", icon: Bell },
    { id: "security" as SettingsTab, label: "الأمان", icon: Shield },
    { id: "backup" as SettingsTab, label: "النسخ الاحتياطي", icon: Database },
    { id: "appearance" as SettingsTab, label: "المظهر", icon: Palette },
  ]

  const handleSave = () => {
    // TODO: Implement save logic
    alert("سيتم حفظ الإعدادات قريباً")
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة إعدادات النظام والتكوين
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">حفظ التغييرات</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:col-span-1">
          <div className="flat-card p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="flat-card p-6">
            {activeTab === "company" && <CompanySettings onChange={() => setHasChanges(true)} />}
            {activeTab === "tax" && <TaxSettings onChange={() => setHasChanges(true)} />}
            {activeTab === "print" && <PrintSettings onChange={() => setHasChanges(true)} />}
            {activeTab === "notifications" && <NotificationSettings onChange={() => setHasChanges(true)} />}
            {activeTab === "security" && <SecuritySettings onChange={() => setHasChanges(true)} />}
            {activeTab === "backup" && <BackupSettings />}
            {activeTab === "appearance" && <AppearanceSettings onChange={() => setHasChanges(true)} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Company Settings Component
function CompanySettings({ onChange }: { onChange: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">معلومات الشركة</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              اسم الشركة
            </label>
            <input
              type="text"
              defaultValue="نظام إدارة المخازن"
              onChange={onChange}
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              العنوان
            </label>
            <input
              type="text"
              defaultValue=""
              onChange={onChange}
              placeholder="أدخل عنوان الشركة"
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                رقم الهاتف
              </label>
              <input
                type="tel"
                onChange={onChange}
                placeholder="+966XXXXXXXXX"
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                onChange={onChange}
                placeholder="info@company.com"
                className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الرقم الضريبي
            </label>
            <input
              type="text"
              onChange={onChange}
              placeholder="أدخل الرقم الضريبي"
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Tax Settings Component
function TaxSettings({ onChange }: { onChange: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">إعدادات الضرائب</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-accent rounded-xl">
            <div>
              <p className="font-medium text-foreground">تفعيل ضريبة القيمة المضافة</p>
              <p className="text-sm text-muted-foreground">تطبيق الضريبة على جميع المبيعات</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} />
              <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              نسبة الضريبة (%)
            </label>
            <input
              type="number"
              defaultValue="15"
              onChange={onChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Print Settings Component
function PrintSettings({ onChange }: { onChange: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">إعدادات الطباعة</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              حجم الورق
            </label>
            <select 
              onChange={onChange}
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="a4">A4 (210 x 297 mm)</option>
              <option value="thermal">Thermal 80mm</option>
              <option value="thermal58">Thermal 58mm</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-accent rounded-xl">
            <div>
              <p className="font-medium text-foreground">طباعة تلقائية</p>
              <p className="text-sm text-muted-foreground">طباعة الفاتورة تلقائياً بعد البيع</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} />
              <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-accent rounded-xl">
            <div>
              <p className="font-medium text-foreground">عرض الشعار</p>
              <p className="text-sm text-muted-foreground">إظهار شعار الشركة في الفواتير</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" onChange={onChange} />
              <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Notification Settings Component
function NotificationSettings({ onChange }: { onChange: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">إعدادات الإشعارات</h3>
        <div className="space-y-3">
          {[
            { label: "تنبيهات المخزون المنخفض", desc: "إشعار عند انخفاض كمية المنتج" },
            { label: "عمليات البيع الجديدة", desc: "إشعار عند إتمام عملية بيع" },
            { label: "طلبات الشراء", desc: "إشعار عند إنشاء أو تحديث طلب شراء" },
            { label: "المرتجعات", desc: "إشعار عند إضافة مرتجع جديد" },
            { label: "المصروفات", desc: "إشعار عند إضافة مصروف جديد" },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-accent rounded-xl">
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" onChange={onChange} />
                <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Security Settings Component
function SecuritySettings({ onChange }: { onChange: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">إعدادات الأمان</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              مدة الجلسة (دقيقة)
            </label>
            <input
              type="number"
              defaultValue="60"
              onChange={onChange}
              min="5"
              max="1440"
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-accent rounded-xl">
            <div>
              <p className="font-medium text-foreground">المصادقة الثنائية</p>
              <p className="text-sm text-muted-foreground">طلب رمز تحقق عند تسجيل الدخول</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} />
              <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-accent rounded-xl">
            <div>
              <p className="font-medium text-foreground">تسجيل النشاط</p>
              <p className="text-sm text-muted-foreground">حفظ سجل بجميع العمليات</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" onChange={onChange} />
              <div className="w-11 h-6 bg-muted peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Backup Settings Component
function BackupSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">النسخ الاحتياطي</h3>
        <div className="space-y-4">
          <div className="p-4 bg-accent rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-foreground">آخر نسخة احتياطية</p>
                <p className="text-sm text-muted-foreground">لم يتم إنشاء نسخة احتياطية بعد</p>
              </div>
              <Database className="w-8 h-8 text-primary" />
            </div>
            <button className="w-full h-10 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              إنشاء نسخة احتياطية الآن
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              النسخ الاحتياطي التلقائي
            </label>
            <select className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="disabled">معطل</option>
              <option value="daily">يومياً</option>
              <option value="weekly">أسبوعياً</option>
              <option value="monthly">شهرياً</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// Appearance Settings Component
function AppearanceSettings({ onChange }: { onChange: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">إعدادات المظهر</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الوضع
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onChange}
                className="p-4 rounded-xl border-2 border-primary bg-primary/5"
              >
                <Palette className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-semibold">فاتح</p>
              </button>
              <button
                onClick={onChange}
                className="p-4 rounded-xl border-2 border-border hover:border-primary/50"
              >
                <Palette className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-semibold">داكن</p>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              اللغة
            </label>
            <select 
              onChange={onChange}
              className="w-full h-10 px-4 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
