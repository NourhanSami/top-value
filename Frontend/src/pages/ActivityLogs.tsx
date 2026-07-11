import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Settings,
  AlertCircle,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatDate } from "@/lib/utils"

interface ActivityLog {
  id: number
  user_id: number
  user: {
    id: number
    name: string
    role: string
  }
  activity_type: string
  description: string
  details?: Record<string, any>
  reference_type?: string
  reference_id?: number
  ip_address?: string
  user_agent?: string
  created_at: string
}

type ActivityTypeFilter = 
  | "all" 
  | "login" 
  | "logout" 
  | "create" 
  | "update" 
  | "delete" 
  | "sale"
  | "purchase"
  | "return"

export default function ActivityLogs() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityTypeFilter>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("today")
  const [currentPage, setCurrentPage] = useState(1)

  // Mock data - replace with actual API call
  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ["activity-logs", searchTerm, activityTypeFilter, userFilter, dateFilter, currentPage],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return { data: [], total: 0 }
    },
  })

  const logs = logsResponse?.data || []

  // Mock statistics
  const stats = {
    total_today: 0,
    total_users: 0,
    total_sales: 0,
    total_updates: 0,
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
      case "logout":
        return User
      case "sale":
        return ShoppingCart
      case "purchase":
        return Package
      case "create":
      case "update":
      case "delete":
        return Settings
      default:
        return Activity
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "login":
        return "text-success"
      case "logout":
        return "text-muted-foreground"
      case "sale":
        return "text-primary"
      case "purchase":
        return "text-info"
      case "create":
        return "text-success"
      case "update":
        return "text-warning"
      case "delete":
        return "text-destructive"
      default:
        return "text-foreground"
    }
  }

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      login: "تسجيل دخول",
      logout: "تسجيل خروج",
      sale: "عملية بيع",
      purchase: "عملية شراء",
      create: "إنشاء",
      update: "تحديث",
      delete: "حذف",
      return: "مرتجع",
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="أنشطة اليوم"
          value={stats.total_today}
          icon={Activity}
          variant="primary"
        />
        <StatCard
          title="مستخدمين نشطين"
          value={stats.total_users}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="عمليات بيع"
          value={stats.total_sales}
          icon={ShoppingCart}
          variant="info"
        />
        <StatCard
          title="تحديثات"
          value={stats.total_updates}
          icon={Settings}
          variant="warning"
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
                placeholder="البحث في سجل النشاط..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Activity Type Filter */}
          <select
            value={activityTypeFilter}
            onChange={(e) => setActivityTypeFilter(e.target.value as ActivityTypeFilter)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع الأنشطة</option>
            <option value="login">تسجيل دخول</option>
            <option value="logout">تسجيل خروج</option>
            <option value="sale">عمليات البيع</option>
            <option value="purchase">عمليات الشراء</option>
            <option value="create">إنشاء</option>
            <option value="update">تحديث</option>
            <option value="delete">حذف</option>
            <option value="return">مرتجعات</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="today">اليوم</option>
            <option value="yesterday">أمس</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="all">كل الفترات</option>
          </select>

          {/* User Filter */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع المستخدمين</option>
            {/* TODO: Add user options dynamically */}
          </select>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Activity className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-foreground font-semibold mb-2">لا توجد أنشطة</p>
            <p className="text-sm text-muted-foreground">لم يتم تسجيل أي نشاط بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log: ActivityLog) => {
              const Icon = getActivityIcon(log.activity_type)
              const colorClass = getActivityColor(log.activity_type)
              
              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn("w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0")}>
                      <Icon className={cn("w-5 h-5", colorClass)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user.name}
                            </span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-md", colorClass, "bg-current/10")}>
                              {getActivityTypeLabel(log.activity_type)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 p-2 bg-accent rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            {JSON.stringify(log.details, null, 2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Placeholder when no API */}
        {!isLoading && logs.length === 0 && (
          <div className="p-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-foreground font-semibold mb-2">قريباً</p>
              <p className="text-sm text-muted-foreground mb-4">
                سيتم عرض سجل النشاط التفصيلي هنا
              </p>
              <div className="max-w-md mx-auto text-right space-y-2">
                <p className="text-xs text-muted-foreground">سيتضمن السجل:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• جميع عمليات تسجيل الدخول والخروج</li>
                  <li>• عمليات البيع والشراء</li>
                  <li>• التعديلات على المنتجات والأسعار</li>
                  <li>• المرتجعات والهوالك</li>
                  <li>• التغييرات في الإعدادات</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination - if needed */}
      {logs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {(currentPage - 1) * 50 + 1} - {Math.min(currentPage * 50, logsResponse?.total || 0)} من {logsResponse?.total || 0}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <button
              disabled={currentPage * 50 >= (logsResponse?.total || 0)}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
