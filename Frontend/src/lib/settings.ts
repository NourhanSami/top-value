import api from "@/lib/api"

const CURRENCY_SYMBOLS: Record<string, string> = {
  EGP: "ج.م",
  SAR: "ر.س",
  AED: "د.إ",
  USD: "$",
  EUR: "€",
}

const CACHE_KEYS = [
  "company_name",
  "company_address",
  "company_phone",
  "company_email",
  "company_tax_number",
  "company_commercial_register",
  "company_website",
  "tax_enabled",
  "tax_rate",
  "tax_name",
  "currency",
  "app_name",
  "paper_size",
  "auto_print",
  "show_logo",
  "print_footer",
  "low_stock_threshold",
  "notify_low_stock",
  "session_timeout",
]

export function getCachedSetting(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(`setting_${key}`) ?? fallback
  } catch {
    return fallback
  }
}

export function setCachedSetting(key: string, value: string) {
  try {
    localStorage.setItem(`setting_${key}`, value)
    // legacy keys used by invoice preview
    if (key === "company_name" || key === "company_tax_number") {
      localStorage.setItem(key, value)
    }
  } catch {
    /* ignore */
  }
}

export function syncSettingsToCache(settings: { key: string; value?: string | null }[]) {
  for (const s of settings) {
    if (!s?.key) continue
    setCachedSetting(s.key, s.value ?? "")
  }
}

export function getCurrencyCode(): string {
  return getCachedSetting("currency", "SAR") || "SAR"
}

export function getCurrencySymbol(): string {
  const code = getCurrencyCode()
  return CURRENCY_SYMBOLS[code] || code
}

export function getTaxConfig() {
  const enabled = getCachedSetting("tax_enabled", "true") === "true"
  const rate = parseFloat(getCachedSetting("tax_rate", "15")) || 0
  const name = getCachedSetting("tax_name", "ضريبة القيمة المضافة")
  return { enabled, rate, name }
}

export function getCompanyInfo() {
  return {
    name: getCachedSetting("company_name", "نظام إدارة المخازن"),
    address: getCachedSetting("company_address"),
    phone: getCachedSetting("company_phone"),
    email: getCachedSetting("company_email"),
    taxNumber: getCachedSetting("company_tax_number"),
    commercialRegister: getCachedSetting("company_commercial_register"),
    website: getCachedSetting("company_website"),
  }
}

/** Load settings from API into localStorage (call after login / app start) */
export async function loadAndCacheSettings() {
  try {
    const res = await api.get("/settings")
    const list = res.data?.data || []
    syncSettingsToCache(list)
    // ensure defaults exist in cache
    for (const key of CACHE_KEYS) {
      if (localStorage.getItem(`setting_${key}`) == null) {
        // leave unset; getters have fallbacks
      }
    }
    return list
  } catch {
    return []
  }
}
