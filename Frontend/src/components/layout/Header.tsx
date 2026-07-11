import { Search, User, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  user?: {
    name: string
    role: string
    warehouse?: string
  }
  onLogout?: () => void
}

export function Header({ user, onLogout }: HeaderProps) {
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "مدير":
        return "bg-primary/10 text-primary"
      case "محاسب":
        return "bg-warning-light text-warning"
      case "مندوب":
        return "bg-info-light text-info"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-40 shadow-flat">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث في النظام..."
              className="w-full h-12 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {user?.name || "المستخدم"}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-md font-medium",
                    getRoleBadgeClass(user?.role || "")
                  )}
                >
                  {user?.role}
                </span>
                {user?.warehouse && (
                  <span className="text-xs text-muted-foreground">
                    {user.warehouse}
                  </span>
                )}
              </div>
            </div>

            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>
      </div>
    </header>
  )
}
