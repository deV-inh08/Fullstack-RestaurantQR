import { TokenRefreshProvider } from "@/src/app/admin/TokenRefreshProvider"
import { AdminSidebar } from "@/src/components/admin/admin-sidebar"
import { AdminSignalRProvider } from "@/src/components/AdminSignalProvider"
import { useTokenRefresh } from "@/src/hooks/useTokenRefresh"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <TokenRefreshProvider />
      <AdminSidebar />
      <AdminSignalRProvider></AdminSignalRProvider>
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
