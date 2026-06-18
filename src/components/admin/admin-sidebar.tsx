"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  ClipboardList,
  QrCode,
  Settings,
  LogOut,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import authApiRequest from "@/src/apiRequests/auth.request"
import { BillBadge } from "../bill/Billbadge"
import { useAppProviderStore } from "@/src/components/app-provider"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/dishes", label: "Dishes", icon: UtensilsCrossed },
  { href: "/admin/accounts", label: "Accounts", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, showBillBadge: true },
  { href: "/admin/tables", label: "Tables", icon: QrCode },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const setRole = useAppProviderStore((state) => state.setRole)


  const handleLogout = async () => {
    try {
      await authApiRequest.logout()
    } finally {
      // Không còn removeTokensFromLS() — cookie đã được /api/auth/logout
      // xoá ở server rồi, ở client chỉ cần reset state.
      setRole(undefined)
      localStorage.removeItem('vietgold_reservations')
      router.push('/')
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border-subtle bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border-subtle px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <span className="text-xs font-bold text-primary-foreground">VG</span>
            </div>
            <span className="text-sm font-bold uppercase tracking-wide text-sidebar-foreground">
              Viet Gold
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wide transition-all",
                  isActive
                    ? "border-l-3 border-l-primary bg-gold-subtle text-primary"
                    : "text-muted-foreground hover:bg-gold-subtle hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {/* BillBadge only on Orders nav item */}
                {item.showBillBadge && <BillBadge />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-border-subtle p-3">
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
