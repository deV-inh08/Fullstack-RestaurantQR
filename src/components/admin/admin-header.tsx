"use client"

import { Suspense } from "react"
import { NotificationBell } from "./NotificationBellAdmin"
import { useGetMe } from "@/src/queries/useAccount"
import Link from "next/link"

interface AdminHeaderProps {
  title: string
  subtitle?: string
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function AdminHeaderInner({ title, subtitle }: AdminHeaderProps) {
  const { data: meData } = useGetMe()
  const me = meData?.payload.data

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-background px-6">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-wide text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <Link href="/admin/setting" className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">
              {me?.name ? getInitials(me.name) : "AD"}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">
              {me?.name ?? "Admin"}
            </p>
            <p className="text-xs text-muted-foreground">
              {me?.email ?? "—"}
            </p>
          </div>
        </Link>
      </div>
    </header>
  )
}

export function AdminHeader(props: AdminHeaderProps) {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border-subtle bg-background px-6">
        <div className="h-4 w-32 animate-pulse rounded bg-gold-subtle" />
      </header>
    }>
      <AdminHeaderInner {...props} />
    </Suspense>
  )
}