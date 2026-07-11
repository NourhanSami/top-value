import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Warehouse,
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Users,
  RotateCcw,
  Package,
  Building2,
  AlertTriangle,
  FileText,
  Truck,
  DollarSign,
  Wallet,
  BarChart3,
  ClipboardList,
  UserCog,
  UsersRound,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  userRole?: string
}

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  children?: NavItem[]
  roles?: string[]
}

const navigationItems: NavItem[] = [
  {
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    path: "/",
    roles: ["مدير", "محاسب"],
  },
  {
    label: "نقطة البيع",
    icon: ShoppingCart,
    path: "/pos",
    roles: ["مدير", "مندوب"],
  },
  {
    label: "المبيعات",
    icon: ShoppingBag,
    path: "/sales",
    roles: ["مدير", "محاسب"],
  },
  {
    label: "العملاء",
    icon: Users,
    path: "/customers",
  },
  {
    label: "المرتجعات",
    icon: RotateCcw,
    path: "/returns",
  },
  {
    label: "إدارة المخزون",
    icon: Package,
    children: [
      { label: "المنتجات", icon: Package, path: "/products" },
      { label: "المخازن", icon: Building2, path: "/warehouses" },
      { label: "الهوالك", icon: AlertTriangle, path: "/damaged-items" },
    ],
    roles: ["مدير", "محاسب"],
  },
  {
    label: "المشتريات",
    icon: FileText,
    children: [
      {
        label: "فواتير الشراء",
        icon: FileText,
        path: "/purchase-invoices",
      },
      { label: "الموردين", icon: Truck, path: "/suppliers" },
    ],
    roles: ["مدير", "محاسب"],
  },
  {
    label: "المالية",
    icon: DollarSign,
    children: [
      { label: "المصروفات", icon: DollarSign, path: "/expenses" },
      { label: "رأس المال", icon: Wallet, path: "/capital-setup" },
    ],
    roles: ["مدير", "محاسب"],
  },
  {
    label: "التقارير",
    icon: BarChart3,
    path: "/reports",
    roles: ["مدير", "محاسب"],
  },
  {
    label: "سجل النشاط",
    icon: ClipboardList,
    path: "/activity-logs",
    roles: ["مدير", "محاسب"],
  },
  {
    label: "الموارد البشرية",
    icon: UserCog,
    children: [
      { label: "الموظفين", icon: UserCog, path: "/employees" },
      { label: "المستخدمين", icon: UsersRound, path: "/users" },
    ],
    roles: ["مدير", "محاسب"],
  },
  {
    label: "الإعدادات",
    icon: Settings,
    path: "/settings",
    roles: ["مدير", "محاسب"],
  },
]

export function Sidebar({ userRole = "مدير" }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const location = useLocation()

  const filteredItems = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  const handleAccordionToggle = (label: string) => {
    setOpenAccordion(openAccordion === label ? null : label)
  }

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 h-screen bg-sidebar-background transition-all duration-300 z-50 peer",
        isExpanded ? "w-64" : "w-20"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false)
        setOpenAccordion(null)
      }}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-center gap-3 border-b border-sidebar-border px-4">
        <div className="w-10 h-10 bg-sidebar-accent rounded-xl flex items-center justify-center flex-shrink-0">
          <Warehouse className="w-6 h-6 text-sidebar-foreground" />
        </div>
        {isExpanded && (
          <div className="flex flex-col text-sidebar-foreground">
            <span className="font-bold text-sm">نظام المخازن</span>
            <span className="text-xs opacity-90">ونقاط البيع</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredItems.map((item) =>
          item.children ? (
            <NavItemWithChildren
              key={item.label}
              item={item}
              isExpanded={isExpanded}
              isOpen={openAccordion === item.label}
              onToggle={() => handleAccordionToggle(item.label)}
              currentPath={location.pathname}
              userRole={userRole}
            />
          ) : (
            <NavItemLink
              key={item.label}
              item={item}
              isExpanded={isExpanded}
              isActive={location.pathname === item.path}
            />
          )
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span className="text-sm font-medium">تسجيل الخروج</span>
          )}
        </button>
      </div>
    </aside>
  )
}

interface NavItemLinkProps {
  item: NavItem
  isExpanded: boolean
  isActive: boolean
}

function NavItemLink({ item, isExpanded, isActive }: NavItemLinkProps) {
  const Icon = item.icon

  return (
    <Link
      to={item.path || "#"}
      className={cn(
        "flex items-center gap-3 px-3 py-2 mb-1 rounded-xl transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {isExpanded && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  )
}

interface NavItemWithChildrenProps {
  item: NavItem
  isExpanded: boolean
  isOpen: boolean
  onToggle: () => void
  currentPath: string
  userRole: string
}

function NavItemWithChildren({
  item,
  isExpanded,
  isOpen,
  onToggle,
  currentPath,
  userRole,
}: NavItemWithChildrenProps) {
  const Icon = item.icon
  const filteredChildren = item.children?.filter(
    (child) => !child.roles || child.roles.includes(userRole)
  )

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground transition-all duration-200"
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {isExpanded && (
          <>
            <span className="text-sm font-medium flex-1 text-right">
              {item.label}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {isExpanded && isOpen && (
        <div className="ml-4 mt-1 space-y-1 animate-accordion-down">
          {filteredChildren?.map((child) => (
            <Link
              key={child.label}
              to={child.path || "#"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                currentPath === child.path
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {child.icon && <child.icon className="w-4 h-4 flex-shrink-0" />}
              <span>{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
