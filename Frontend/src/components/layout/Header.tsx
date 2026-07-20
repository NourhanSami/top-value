import { useEffect, useRef, useState } from "react"
import { Search, User, LogOut, Package, Users, Building2, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

interface HeaderProps {
  user?: {
    name: string
    role: string
    warehouse?: string
  }
  onLogout?: () => void
}

type SearchHit = {
  id: number
  label: string
  sub?: string
  type: "product" | "customer" | "supplier"
  path: string
}

export function Header({ user, onLogout }: HeaderProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const [productsRes, customersRes, suppliersRes] = await Promise.all([
          api.get("/products", { params: { search: q, limit: 5 } }),
          api.get("/customers", { params: { search: q, limit: 5 } }),
          api.get("/suppliers", { params: { search: q, limit: 5 } }),
        ])
        if (cancelled) return

        const hits: SearchHit[] = [
          ...(productsRes.data?.data || []).map((p: any) => ({
            id: p.id,
            label: p.name,
            sub: p.sku || p.barcode || undefined,
            type: "product" as const,
            path: "/products",
          })),
          ...(customersRes.data?.data || []).map((c: any) => ({
            id: c.id,
            label: c.name,
            sub: c.phone || undefined,
            type: "customer" as const,
            path: "/customers",
          })),
          ...(suppliersRes.data?.data || []).map((s: any) => ({
            id: s.id,
            label: s.name,
            sub: s.phone || undefined,
            type: "supplier" as const,
            path: "/suppliers",
          })),
        ]
        setResults(hits)
        setOpen(true)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const iconFor = (type: SearchHit["type"]) => {
    if (type === "product") return Package
    if (type === "customer") return Users
    return Building2
  }

  const typeLabel = (type: SearchHit["type"]) => {
    if (type === "product") return "منتج"
    if (type === "customer") return "عميل"
    return "مورد"
  }

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-40 shadow-flat">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex-1 max-w-md" ref={wrapRef}>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setOpen(true)}
              placeholder="البحث في النظام..."
              className="w-full h-12 pr-11 pl-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            {loading && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}

            {open && query.trim().length >= 2 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                {results.length === 0 && !loading ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">لا توجد نتائج</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {results.map((hit) => {
                      const Icon = iconFor(hit.type)
                      return (
                        <li key={`${hit.type}-${hit.id}`}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-muted transition-colors"
                            onClick={() => {
                              setOpen(false)
                              setQuery("")
                              navigate(hit.path)
                            }}
                          >
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{hit.label}</p>
                              {hit.sub && <p className="text-xs text-muted-foreground truncate">{hit.sub}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground">{typeLabel(hit.type)}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

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
