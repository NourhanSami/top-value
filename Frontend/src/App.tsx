import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Protected Routes Component
function ProtectedRoutes() {
  const { user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Convert user data to match MainLayout props
  // Map English roles to Arabic for Sidebar
  const roleMapping: Record<string, "مدير" | "موظف" | "محاسب" | "مندوب"> = {
    "admin": "مدير",
    "manager": "مدير",
    "accountant": "محاسب",
    "cashier": "مندوب",
    "employee": "موظف"
  }

  const arabicRole = roleMapping[user.role.toLowerCase()] || "مدير"

  const mockUser = {
    name: user.name,
    role: arabicRole,
    warehouse: user.branch_name || "الفرع الرئيسي",
  }

  return (
    <MainLayout
      user={mockUser}
      onLogout={() => {
        logout()
        window.location.href = "/login"
      }}
    />
  )
}

// App Routes Component
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/products" element={<Products />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/purchase-invoices" element={<PurchaseOrders />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/warehouses" element={<Branches />} />
        <Route path="/users" element={<Users />} />
        <Route path="/employees" element={<Users />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/damaged-items" element={<DamagedItems />} />
        <Route path="/activity-logs" element={<ActivityLogs />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/capital-setup" element={<div className="p-6"><h1 className="text-2xl font-bold">رأس المال</h1><p className="text-muted-foreground mt-2">قريباً...</p></div>} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/vouchers" element={<PaymentVouchers />} />
        <Route path="/installments" element={<InstallmentsPage />} />
        <Route path="/bank-accounts" element={<BankAccountsPage />} />
        <Route path="/inventory-transfers" element={<InventoryTransfersPage />} />
        <Route path="/profit-loss" element={<ProfitLossReport />} />
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
