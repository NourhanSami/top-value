import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { MainLayout } from "./components/layout/MainLayout"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import POS from "./pages/POS"
import Products from "./pages/Products"
import Customers from "./pages/Customers"
import Suppliers from "./pages/Suppliers"
import Expenses from "./pages/Expenses"
import PurchaseOrders from "./pages/PurchaseOrders"
import Branches from "./pages/Branches"
import Users from "./pages/Users"
import Returns from "./pages/Returns"
import Settings from "./pages/Settings"
import DamagedItems from "./pages/DamagedItems"
import ActivityLogs from "./pages/ActivityLogs"
import Reports from "./pages/Reports"
import Sales from "./pages/Sales"
import Quotations from "./pages/Quotations"
import PaymentVouchers from "./pages/PaymentVouchers"
import InstallmentsPage from "./pages/InstallmentsPage"
import BankAccountsPage from "./pages/BankAccountsPage"
import InventoryTransfersPage from "./pages/InventoryTransfersPage"
import ProfitLossReport from "./pages/ProfitLossReport"
import CapitalSetup from "./pages/CapitalSetup"
import TreasuryPage from "./pages/TreasuryPage"
import DriverRoutesPage from "./pages/DriverRoutesPage"
import RolesPage from "./pages/RolesPage"
import { resolveMenuAccess, sectionForPath } from "./lib/menuAccess"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AccessGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  const role = (user?.role || "").toLowerCase()
  // Admin/manager always see all pages unless explicitly restricted later
  if (role === "admin" || role === "manager" || role === "مدير") {
    return <>{children}</>
  }

  const allowed = resolveMenuAccess(user?.menuAccess, user?.role)
  const section = sectionForPath(location.pathname)

  if (section && !allowed.includes(section)) {
    const fallback = allowed.includes("dashboard")
      ? "/"
      : allowed.includes("pos")
        ? "/pos"
        : allowed.includes("customers")
          ? "/customers"
          : allowed.includes("sales")
            ? "/sales"
            : allowed.includes("returns")
              ? "/returns"
              : "/"
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

function ProtectedRoutes() {
  const { user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const roleMapping: Record<string, string> = {
    admin: "مدير",
    manager: "مدير",
    accountant: "محاسب",
    cashier: "مندوب",
    employee: "موظف",
  }

  const arabicRole = roleMapping[user.role.toLowerCase()] || user.roleDisplayName || user.role

  const layoutUser = {
    name: user.name,
    role: arabicRole,
    warehouse: user.branch_name || "الفرع الرئيسي",
  }

  return (
    <MainLayout
      user={layoutUser}
      onLogout={() => {
        logout()
        window.location.href = "/login"
      }}
    />
  )
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<AccessGuard><Dashboard /></AccessGuard>} />
        <Route path="/pos" element={<AccessGuard><POS /></AccessGuard>} />
        <Route path="/products" element={<AccessGuard><Products /></AccessGuard>} />
        <Route path="/sales" element={<AccessGuard><Sales /></AccessGuard>} />
        <Route path="/customers" element={<AccessGuard><Customers /></AccessGuard>} />
        <Route path="/suppliers" element={<AccessGuard><Suppliers /></AccessGuard>} />
        <Route path="/expenses" element={<AccessGuard><Expenses /></AccessGuard>} />
        <Route path="/purchase-orders" element={<AccessGuard><PurchaseOrders /></AccessGuard>} />
        <Route path="/purchase-invoices" element={<AccessGuard><PurchaseOrders /></AccessGuard>} />
        <Route path="/branches" element={<AccessGuard><Branches /></AccessGuard>} />
        <Route path="/warehouses" element={<AccessGuard><Branches /></AccessGuard>} />
        <Route path="/users" element={<AccessGuard><Users /></AccessGuard>} />
        <Route path="/roles" element={<AccessGuard><RolesPage /></AccessGuard>} />
        <Route path="/employees" element={<Navigate to="/users" replace />} />
        <Route path="/returns" element={<AccessGuard><Returns /></AccessGuard>} />
        <Route path="/settings" element={<AccessGuard><Settings /></AccessGuard>} />
        <Route path="/damaged-items" element={<AccessGuard><DamagedItems /></AccessGuard>} />
        <Route path="/activity-logs" element={<AccessGuard><ActivityLogs /></AccessGuard>} />
        <Route path="/reports" element={<AccessGuard><Reports /></AccessGuard>} />
        <Route path="/capital-setup" element={<AccessGuard><CapitalSetup /></AccessGuard>} />
        <Route path="/treasury" element={<AccessGuard><TreasuryPage /></AccessGuard>} />
        <Route path="/driver-routes" element={<AccessGuard><DriverRoutesPage /></AccessGuard>} />
        <Route path="/quotations" element={<AccessGuard><Quotations /></AccessGuard>} />
        <Route path="/vouchers" element={<AccessGuard><PaymentVouchers /></AccessGuard>} />
        <Route path="/installments" element={<AccessGuard><InstallmentsPage /></AccessGuard>} />
        <Route path="/bank-accounts" element={<AccessGuard><BankAccountsPage /></AccessGuard>} />
        <Route path="/inventory-transfers" element={<AccessGuard><InventoryTransfersPage /></AccessGuard>} />
        <Route path="/profit-loss" element={<AccessGuard><ProfitLossReport /></AccessGuard>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
