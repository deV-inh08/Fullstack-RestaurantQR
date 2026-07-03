"use client"

import { useState, Suspense } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { usePathname, useRouter } from "@/src/i18n/navigation"
import { AdminHeader } from "@/src/components/admin/admin-header"
import { Button } from "@/src/components/ui/button"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"

import { Search, Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import { cn } from "@/src/lib/utils"
import PaginationV1 from "@/src/components/pagination/pagination_v1"
import { useGetTables } from "@/src/queries/useTable"
import { TableDto } from "@/src/schema/table.schema"
import { AddTableModal } from "./components/AddTable"
import { EditTableModal } from "./components/EditTable"
import { DeleteTableDialog } from "./components/DeleteTableDialog"
import QRPreview from "./components/QR_Preview"
import { TableSkeleton } from "@/src/components/Skeleton/skeleton"

function StatusPill({ status }: { status: "Available" | "Occupied" | "Hidden" }) {
  const styles: Record<"Available" | "Occupied" | "Hidden", string> = {
    Available: "bg-green-600 text-white",
    Occupied: "bg-primary text-primary-foreground",
    Hidden: "bg-[#7D7D7D] text-white",
  }

  return (
    <span
      className={cn(
        "inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wide",
        styles[status] || styles.Available
      )}
    >
      {status}
    </span>
  )
}

import { PAGE_SIZE } from "@/src/config"

// ─── Main page ──────────────────────────────────────
export default function TablesPage() {
  const tCommon = useTranslations("Admin.Common")
  return (
    <Suspense fallback={<div className="p-6">{tCommon("loading")}</div>}>
      <TablesContent />
    </Suspense>
  )
}

function TablesContent() {
  const t = useTranslations("Admin.Tables")
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

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [tableToEdit, setTableToEdit] = useState<TableDto | null>(null)
  const [tableToDelete, setTableToDelete] = useState<TableDto | null>(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useGetTables({ page, pageSize: PAGE_SIZE })
  const tables = (data?.payload.data.data ?? []).filter(t =>
    String(t.number).includes(search)
  )

  const pagination = {
    page: data?.payload.data.page,
    pageSize: data?.payload.data.pageSize,
    totalPages: data?.payload.data.totalPages,
  };

  return (
    <div className="min-h-screen">
      <AdminHeader title={t("header.title")} subtitle={t("header.subtitle")} />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder={t("searchPlaceholder")} value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 w-60 rounded-md border border-input-border bg-input pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none" />
          </div>
          <Button onClick={() => setIsAddOpen(true)}
            className="h-10 gap-2 rounded-md bg-primary px-6 font-bold uppercase tracking-wide text-primary-foreground shadow-md transition-all hover:shadow-gold">
            <Plus className="h-4 w-4" />{t("addTable")}
          </Button>
        </div>

        <div className="rounded-md border border-border-subtle bg-card shadow-card">
          {isLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border-subtle hover:bg-transparent">
                  {[t("columns.number"), t("columns.capacity"), t("columns.qrCode"), t("columns.status"), ''].map(h => (
                    <TableHead key={h} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">{t("empty")}</TableCell></TableRow>
                )}
                {tables.map(table => (
                  <TableRow key={table.id} className="border-border-subtle transition-colors hover:bg-gold-subtle/30">
                    <TableCell>
                      <span className="text-2xl font-bold text-primary">{String(table.number).padStart(2, '0')}</span>
                    </TableCell>
                    <TableCell className="text-foreground">{table.capacity} {t("capacitySuffix")}</TableCell>
                    <TableCell><QRPreview tableId={table.id} /></TableCell>
                    <TableCell><StatusPill status={table.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setTableToEdit(table)}
                          className="rounded-md text-foreground hover:bg-gold-subtle">{t("editAction")}</Button>
                        <Button variant="ghost" size="icon" onClick={() => setTableToDelete(table)}
                          className="h-8 w-8 rounded-md text-foreground hover:bg-destructive/20 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginationV1 totalPages={pagination.totalPages || 10} page={pagination.page || 1} onPageChange={handlePageChange} />
        </div>
      </div>

      <AddTableModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditTableModal table={tableToEdit} onClose={() => setTableToEdit(null)} />
      <DeleteTableDialog table={tableToDelete} onClose={() => setTableToDelete(null)} />
    </div>
  )
}
