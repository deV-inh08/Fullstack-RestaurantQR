"use client"

import { useState, Suspense } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { usePathname, useRouter } from "@/src/i18n/navigation"
import { AdminHeader } from "@/src/components/admin/admin-header"
import { Button } from "@/src/components/ui/button"
import { Search, Plus, ShieldCheck } from "lucide-react"
import PaginationV1 from "@/src/components/pagination/pagination_v1"
import { useGetAccounts, useGetMe } from "@/src/queries/useAccount"
import TableAccount, { AccountItem } from "./components/table_account"
import AddStaff from "@/src/components/admin/add-staff"
import AddAdmin from "@/src/components/admin/add-admin"
import { TableSkeleton } from "@/src/components/Skeleton/skeleton"
import { PAGE_SIZE } from "@/src/config"

export default function AccountsPage() {
  const tCommon = useTranslations("Admin.Common")
  return (
    <Suspense fallback={<div className="p-6">{tCommon("loading")}</div>}>
      <AccountsContent />
    </Suspense>
  )
}

function AccountsContent() {
  const t = useTranslations("Admin.Accounts")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pageParam = searchParams.get('page')
  const page = pageParam ? Number(pageParam) : 1

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false)
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useGetAccounts({ page, pageSize: PAGE_SIZE })
  const { data: meData } = useGetMe()
  const myRole = meData?.payload.data.role  // "SuperAdmin" | "Admin" | "Staff"

  const accountsData = data?.payload.data.data
  const filteredAccounts = accountsData?.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pagination = {
    page: data?.payload.data.page ?? 1,
    totalPages: data?.payload.data.totalPages ?? 1,
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title={t("header.title")} subtitle={t("header.subtitle")} />

      <div className="p-6">
        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-80 rounded-md border border-input-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Create Admin — SuperAdmin only */}
            {myRole === 'SuperAdmin' && (
              <Button
                onClick={() => setIsAddAdminOpen(true)}
                variant="outline"
                className="h-10 gap-2 rounded-md border-primary/40 px-4 font-bold uppercase tracking-wide text-primary hover:bg-primary/10"
              >
                <ShieldCheck className="h-4 w-4" />
                {t("createAdmin")}
              </Button>
            )}

            {/* Create Staff — Admin & SuperAdmin */}
            {(myRole === 'SuperAdmin' || myRole === 'Admin') && (
              <Button
                onClick={() => setIsAddStaffOpen(true)}
                className="h-10 gap-2 rounded-md bg-primary px-6 font-bold uppercase tracking-wide text-primary-foreground shadow-md transition-all hover:shadow-gold"
              >
                <Plus className="h-4 w-4" />
                {t("createStaff")}
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border border-border-subtle bg-card shadow-card">
          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : (
            <TableAccount accounts={filteredAccounts as AccountItem[] ?? []} />
          )}
          <PaginationV1
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <AddStaff isOpen={isAddStaffOpen} onOpenChange={setIsAddStaffOpen} />
      <AddAdmin isOpen={isAddAdminOpen} onOpenChange={setIsAddAdminOpen} />
    </div>
  )
}