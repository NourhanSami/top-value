import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Warehouse,
  Eye,
  EyeOff,
  Server,
  Laptop,
  Settings as SettingsIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import api from "@/lib/api"

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showSettings, setShowSettings] = useState(false)

  const [dbStatus, setDbStatus] = useState<"connected" | "disconnected" | "checking">("checking")
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "checking">("checking")

  // Check API and DB status on mount
  useEffect(() => {
    checkBackendStatus()
  }, [])

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("remember_email")
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  const checkBackendStatus = async () => {
    try {
      // Check API health - using axios directly to avoid /api prefix
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
      const healthURL = baseURL.replace('/api', '/health')
      await fetch(healthURL)
      setApiStatus("connected")
      setDbStatus("connected")
    } catch (err) {
      setApiStatus("disconnected")
      setDbStatus("disconnected")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password)
      
      if (rememberMe) {
        localStorage.setItem("remember_email", email)
      } else {
        localStorage.removeItem("remember_email")
      }

      navigate("/")
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "فشل تسجيل الدخول. يرجى التحقق من البيانات."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Status Indicators */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <StatusIndicator
          label="DB"
          status={dbStatus}
          onClick={() => {}}
        />
        <StatusIndicator
          label="API"
          status={apiStatus}
          onClick={() => {}}
        />
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <SettingsIcon className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md flat-card p-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
            <Warehouse className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            نظام المخازن ونقاط البيع
          </h1>
          <p className="text-sm text-muted-foreground">سجل دخولك للمتابعة</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full h-12 px-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 pr-12 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-foreground">تذكرني</span>
            </label>

            <button
              type="button"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              نسيت كلمة المرور؟
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © 2024 نظام إدارة المخازن ونقاط البيع
        </p>
      </div>

      {/* Settings Dialog */}
      {showSettings && (
        <NetworkSettingsDialog onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

interface StatusIndicatorProps {
  label: string
  status: "connected" | "disconnected" | "checking" | "starting"
  onClick: () => void
}

function StatusIndicator({ label, status, onClick }: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "bg-success"
      case "disconnected":
        return "bg-destructive"
      case "checking":
        return "bg-warning animate-pulse"
      case "starting":
        return "bg-info"
      default:
        return "bg-muted"
    }
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className={cn("w-3 h-3 rounded-full", getStatusColor())} />
    </button>
  )
}

interface NetworkSettingsDialogProps {
  onClose: () => void
}

function NetworkSettingsDialog({ onClose }: NetworkSettingsDialogProps) {
  const [mode, setMode] = useState<"master" | "employee">("master")
  const [ip, setIp] = useState("")
  const [port, setPort] = useState("8002")

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg flat-card p-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground mb-6">
          إعدادات الشبكة
        </h2>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setMode("master")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all",
              mode === "master"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <Server className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              جهاز رئيسي (Master)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              الخادم الأساسي
            </p>
          </button>

          <button
            onClick={() => setMode("employee")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all",
              mode === "employee"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <Laptop className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              جهاز موظف (Employee)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              الاتصال بالخادم
            </p>
          </button>
        </div>

        {/* Mode-Specific Content */}
        {mode === "master" ? (
          <div className="p-4 bg-accent rounded-xl">
            <p className="text-sm text-foreground font-medium mb-2">
              عنوان الخادم:
            </p>
            <div className="flex items-center gap-2 p-3 bg-card rounded-lg">
              <code className="flex-1 text-sm text-primary font-mono">
                192.168.1.100:8002
              </code>
              <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors">
                نسخ
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                عنوان IP
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                المنفذ (Port)
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="8002"
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button className="w-full h-10 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              اختبار الاتصال
            </button>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full h-10 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
        >
          إغلاق
        </button>
      </div>
    </div>
  )
}
