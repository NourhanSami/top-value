import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

interface MainLayoutProps {
  user?: {
    name: string
    role: string
    warehouse?: string
  }
  onLogout?: () => void
}

export function MainLayout({ user, onLogout }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="mr-20 peer-hover:mr-64 transition-all duration-300">
        <Header user={user} onLogout={onLogout} />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
