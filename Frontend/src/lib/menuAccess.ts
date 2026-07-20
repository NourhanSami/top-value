/** Menu section keys used for per-user dashboard/sidebar access */

export const MENU_SECTIONS = [
  { key: "dashboard", label: "لوحة التحكم" },
  { key: "pos", label: "نقطة البيع" },
  { key: "sales", label: "المبيعات" },
  { key: "quotations", label: "عروض الأسعار" },
  { key: "returns", label: "المرتجعات" },
  { key: "customers", label: "العملاء" },
  { key: "inventory", label: "إدارة المخزون" },
  { key: "purchases", label: "المشتريات" },
  { key: "finance", label: "المالية" },
  { key: "reports", label: "التقارير" },
  { key: "activity", label: "سجل النشاط" },
  { key: "hr", label: "الموارد البشرية" },
  { key: "settings", label: "الإعدادات" },
] as const

export type MenuSectionKey = (typeof MENU_SECTIONS)[number]["key"]

export const ALL_MENU_KEYS: MenuSectionKey[] = MENU_SECTIONS.map((s) => s.key)

/** Default sections when admin picks a role (can still customize) */
export const ROLE_DEFAULT_MENUS: Record<string, MenuSectionKey[]> = {
  admin: [...ALL_MENU_KEYS],
  manager: [
    "dashboard", "pos", "sales", "quotations", "returns", "customers",
    "inventory", "purchases", "finance", "reports", "activity", "settings",
  ],
  cashier: ["pos", "sales", "returns", "customers"],
  employee: ["returns", "customers"],
  accountant: [
    "dashboard", "sales", "quotations", "returns", "customers",
    "inventory", "purchases", "finance", "reports", "activity", "settings",
  ],
}

export function parseMenuAccess(
  raw?: string | string[] | null
): MenuSectionKey[] | null {
  if (!raw) return null
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((k): k is MenuSectionKey =>
      ALL_MENU_KEYS.includes(k as MenuSectionKey)
    )
  } catch {
    return null
  }
}

export function resolveMenuAccess(
  menuAccessRaw: string | string[] | null | undefined,
  roleName?: string | null
): MenuSectionKey[] {
  const custom = parseMenuAccess(menuAccessRaw)
  if (custom && custom.length > 0) return custom

  const role = (roleName || "").toLowerCase().trim()
  const roleAliases: Record<string, string> = {
    admin: "admin",
    manager: "manager",
    accountant: "accountant",
    cashier: "cashier",
    employee: "employee",
    مدير: "admin",
    محاسب: "accountant",
    مندوب: "cashier",
    موظف: "employee",
  }
  const normalized = roleAliases[role] || role
  if (normalized && ROLE_DEFAULT_MENUS[normalized]) return ROLE_DEFAULT_MENUS[normalized]
  return ["dashboard", "customers", "returns"]
}

/** Map route path → menu section key */
export const PATH_TO_SECTION: Record<string, MenuSectionKey> = {
  "/": "dashboard",
  "/pos": "pos",
  "/sales": "sales",
  "/quotations": "quotations",
  "/returns": "returns",
  "/customers": "customers",
  "/products": "inventory",
  "/warehouses": "inventory",
  "/branches": "inventory",
  "/damaged-items": "inventory",
  "/inventory-transfers": "inventory",
  "/purchase-orders": "purchases",
  "/purchase-invoices": "purchases",
  "/suppliers": "purchases",
  "/vouchers": "finance",
  "/installments": "finance",
  "/bank-accounts": "finance",
  "/expenses": "finance",
  "/capital-setup": "finance",
  "/reports": "reports",
  "/profit-loss": "reports",
  "/activity-logs": "activity",
  "/users": "hr",
  "/employees": "hr",
  "/settings": "settings",
}

export function sectionForPath(pathname: string): MenuSectionKey | null {
  if (PATH_TO_SECTION[pathname]) return PATH_TO_SECTION[pathname]
  const match = Object.keys(PATH_TO_SECTION).find(
    (p) => p !== "/" && pathname.startsWith(p)
  )
  return match ? PATH_TO_SECTION[match] : null
}
