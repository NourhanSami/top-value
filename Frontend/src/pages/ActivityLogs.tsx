import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  User,
  Activity,
  ShoppingCart,
  Package,
  Users,
  Settings,
} from "lucide-react"
import { StatCard } from "@/components/ui/StatCard"
import { cn, formatDate } from "@/lib/utils"
import api from "@/lib/api"
import { userService } from "@/services/api.service"

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

const activityApi = {
  getAll: (params?: any) => api.get("/activity-logs", { params }).then((r) => r.data),
  getStats: () => api.get("/activity-logs/statistics").then((r) => r.data),
}

export default function ActivityLogs() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityTypeFilter>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("month")
  const [currentPage, setCurrentPage] = useState(1)

  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ["activity-logs", searchTerm, activityTypeFilter, userFilter, dateFilter, currentPage],
    queryFn: () =>
      activityApi.getAll({
        page: currentPage,
        limit: 30,
        search: searchTerm || undefined,
        action: activityTypeFilter !== "all" ? activityTypeFilter : undefined,
        userId: userFilter !== "all" ? userFilter : undefined,
        dateFilter,
      }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ["activity-logs-stats"],
    queryFn: activityApi.getStats,
  })

  const { data: usersResponse } = useQuery({
    queryKey: ["users-list-filter"],
    queryFn: () => userService.getAll({ limit: 100 }),
  })

  const logs = logsResponse?.data || []
  const pagination = logsResponse?.pagination
  const stats = statsResponse?.data || {}
  const users: any[] = usersResponse?.data || []

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
      case "create":
        return "text-success"
      case "logout":
        return "text-muted-foreground"
      case "sale":
        return "text-primary"
      case "purchase":
        return "text-info"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="أنشطة اليوم" value={Number(stats.totalToday || 0)} icon={Activity} variant="primary" />
        <StatCard title="مستخدمين نشطين" value={Number(stats.activeUsers || 0)} icon={Users} variant="success" />
        <StatCard title="عمليات بيع" value={Number(stats.totalSales || 0)} icon={ShoppingCart} variant="info" />
        <StatCard title="تحديثات" value={Number(stats.totalUpdates || 0)} icon={Settings} variant="warning" />
      </div>

      <div className="flat-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث في سجل النشاط..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full h-10 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <select
            value={activityTypeFilter}
            onChange={(e) => { setActivityTypeFilter(e.target.value as ActivityTypeFilter); setCurrentPage(1) }}
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

          <select
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1) }}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="today">اليوم</option>
            <option value="yesterday">أمس</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="all">كل الفترات</option>
          </select>

          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1) }}
            className="h-10 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">جميع المستخدمين</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flat-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Activity className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-foreground font-semibold mb-2">لا توجد أنشطة</p>
            <p className="text-sm text-muted-foreground">جرّب تغيير الفلتر أو الفترة الزمنية</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log: any) => {
              const Icon = getActivityIcon(log.action)
              const colorClass = getActivityColor(log.action)
              return (
                <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className={cn("w-5 h-5", colorClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{log.description}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user?.name || "نظام"}
                            </span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-md bg-muted", colorClass)}>
                              {getActivityTypeLabel(log.action)}
                            </span>
                            {log.entityType && (
                              <span className="text-xs text-muted-foreground">{log.entityType}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              عرض {logs.length} من {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40"
              >
                السابق
              </button>
              <span className="px-3 py-1 text-sm">{currentPage} / {pagination.totalPages}</span>
              <button
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
