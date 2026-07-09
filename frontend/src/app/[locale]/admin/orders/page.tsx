"use client"

import { useMemo, useState, useCallback, Suspense } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { usePathname, useRouter } from "@/src/i18n/navigation"
import { AdminHeader } from "@/src/components/admin/admin-header"
import { useQueryClient } from "@tanstack/react-query"
import { useOrderSignalR } from "@/src/hooks/useOrderSignalR"
import { Button } from "@/src/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/src/components/ui/table"

import { ChevronDown, ChevronRight, Eye, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn, formatCurrency, formatTime, handleErrorApi } from "@/src/lib/utils"
import PaginationV1 from "@/src/components/pagination/pagination_v1"
import { useGetOrders, useUpdateOrderStatusMutation, orderKeys } from "@/src/queries/useOrder"
import { OrderStatus, STATUS_VALUES, useOrderStatusLabels } from "./components/status_select"
import CreateOrderModal from "./components/addOrder"
import { StatusBadge, ViewOrderModal, useOrderStatusBadgeConfig } from "./components/viewModel"
import { EditOrderModal } from "./components/editOrder"
import { OrderDto } from "@/src/schema/order.schema"
import TableStatusGrid from "./components/TableStatusGrid"
import { OrderRowSkeleton } from "@/src/components/Skeleton/skeleton"
import BillAdminRequestSection from "@/src/components/bill/BillAdminRequestSection"
import { PAGE_SIZE } from "@/src/config"

// ─── Grouping: gom các dòng order theo bàn + khách (cùng 1 lượt gọi món) ─────
type OrderGroup = {
  key: string
  tableId: number
  tableNumber: number
  guestId: number
  guestName: string
  items: OrderDto[]
  total: number
  latestCreatedAt: string
}

function groupOrders(orders: OrderDto[]): OrderGroup[] {
  const map = new Map<string, OrderGroup>()
  for (const o of orders) {
    const key = `${o.tableId}-${o.guestId}`
    const existing = map.get(key)
    if (existing) {
      existing.items.push(o)
      existing.total += o.dishPrice ? o.dishPrice * o.quantity : 0
      if (new Date(o.createdAt) > new Date(existing.latestCreatedAt)) {
        existing.latestCreatedAt = o.createdAt
      }
    } else {
      map.set(key, {
        key,
        tableId: o.tableId,
        tableNumber: o.tableNumber,
        guestId: o.guestId,
        guestName: o.guestName,
        items: [o],
        total: o.dishPrice ? o.dishPrice * o.quantity : 0,
        latestCreatedAt: o.createdAt,
      })
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
  )
}

// ─── Main page ──────────────────────────────────────
export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-6">Đang tải...</div>}>
      <OrdersContent />
    </Suspense>
  )
}

function OrdersContent() {
  const t = useTranslations("Admin.Orders")
  const statusBadgeConfig = useOrderStatusBadgeConfig()
  const statusLabels = useOrderStatusLabels()
  const updateStatusMutation = useUpdateOrderStatusMutation()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
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

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createPreselectedTable, setCreatePreselectedTable] = useState<number | undefined>()
  const [orderToView, setOrderToView] = useState<OrderDto | null>(null)
  const [orderToEdit, setOrderToEdit] = useState<OrderDto | null>(null)

  const { data, isLoading } = useGetOrders({ page, pageSize: PAGE_SIZE })
  const queryClient = useQueryClient()

  const handleOrderChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orderKeys.allOrders })
  }, [queryClient])

  // FIX: removed token prop (deleted), added enabled: true (required)
  useOrderSignalR({
    role: 'staff',
    enabled: true,
    onOrderCreated: handleOrderChange,
    onOrderStatusUpdated: handleOrderChange,
  })

  const handleTableClick = (tableId: number) => {
    setCreatePreselectedTable(tableId)
    setIsCreateOpen(true)
  }

  const getTotal = (o: OrderDto) =>
    o.dishPrice ? formatCurrency(o.dishPrice * o.quantity) : '—'

  const handleStatusChange = (v: string) => { setStatusFilter(v); handlePageChange(1) }
  const handleDateFromChange = (v: string) => { setDateFrom(v); handlePageChange(1) }
  const handleDateToChange = (v: string) => { setDateTo(v); handlePageChange(1) }

  const orders = useMemo(() => {
    return (data?.payload.data.data ?? []).filter(o => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      const matchFrom = !dateFrom || new Date(o.createdAt) >= new Date(dateFrom)
      const matchTo = !dateTo || new Date(o.createdAt) <= new Date(dateTo + 'T23:59:59')
      return matchStatus && matchFrom && matchTo
    })
  }, [data, statusFilter, dateFrom, dateTo])

  const groups = useMemo(() => groupOrders(orders), [orders])

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleBulkStatusChange = async (group: OrderGroup, status: OrderStatus) => {
    try {
      await Promise.all(
        group.items.map(item => updateStatusMutation.mutateAsync({ id: item.id, status }))
      )
      toast.success(t("group.updateAllSuccess", { count: group.items.length, status: statusLabels[status] }))
    } catch (error) {
      handleErrorApi({ error })
    }
  }

  const total = data?.payload.data.total
  const pagination = {
    page: data?.payload.data.page ?? 1,
    totalPages: data?.payload.data.totalPages ?? 1,
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title={t("header.title")} subtitle={t("header.subtitle")} />

      <div className="p-6">
        <BillAdminRequestSection />
        <TableStatusGrid onSelectTable={handleTableClick} />

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date from */}
              <div className="relative flex items-center">
                <svg className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input type="date" value={dateFrom} onChange={e => handleDateFromChange(e.target.value)}
                  className="h-10 w-44 rounded-md border border-input-border bg-input pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none [color-scheme:dark]" />
              </div>
              <span className="text-sm text-muted-foreground">{t("dateTo")}</span>
              <div className="relative flex items-center">
                <svg className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input type="date" value={dateTo} onChange={e => handleDateToChange(e.target.value)}
                  className="h-10 w-44 rounded-md border border-input-border bg-input pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none [color-scheme:dark]" />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-10 w-36 rounded-md border-input-border bg-input text-sm text-foreground focus:ring-0">
                  <SelectValue placeholder={t("statusAll")} />
                </SelectTrigger>
                <SelectContent className="rounded-md border-border-subtle bg-surface">
                  <SelectItem value="all" className="text-foreground focus:bg-gold-subtle">{t("statusAll")}</SelectItem>
                  {STATUS_VALUES.map(s => (
                    <SelectItem key={s} value={s} className="text-foreground focus:bg-gold-subtle">
                      {statusBadgeConfig[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{t("totalCount", { count: total ?? 0 })}</span>
            </div>

            <Button
              onClick={() => { setCreatePreselectedTable(undefined); setIsCreateOpen(true) }}
              className="h-10 gap-2 rounded-md bg-primary px-5 font-bold uppercase tracking-wide text-black shadow-md hover:shadow-gold"
            >
              <Plus className="h-4 w-4" />
              {t("createOrder")}
            </Button>
          </div>

          <div className="rounded-md border border-border-subtle bg-card shadow-card">
            {isLoading ? (
              <div className="w-full">
                <div className="flex items-center gap-4 border-b border-border-subtle px-4 py-3">
                  {[t("columns.orderId"), t("columns.table"), t("columns.guest"), t("columns.items"), t("columns.total"), t("columns.status"), t("columns.time"), t("columns.actions")].map(h => (
                    <div key={h} className="flex-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</div>
                  ))}
                </div>
                <OrderRowSkeleton rows={8} />
              </div>
            ) : groups.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">{t("empty")}</div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {groups.map(group => {
                  const isCollapsed = collapsedGroups.has(group.key)
                  return (
                    <div key={group.key}>
                      {/* ── Group header: bàn + khách, tổng quan, cập nhật hàng loạt ── */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/40 px-4 py-3">
                        <button
                          onClick={() => toggleGroup(group.key)}
                          className="flex items-center gap-2 text-left"
                          aria-label={isCollapsed ? t("group.expandAria") : t("group.collapseAria")}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-bold text-foreground">
                            {t("columns.table")} {group.tableNumber}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{group.guestName}</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {t("group.itemsCount", { count: group.items.length })}
                          </span>
                          <span className="font-bold text-primary">{formatCurrency(group.total)}</span>
                          <span className="text-muted-foreground text-sm tabular-nums">
                            {formatTime(group.latestCreatedAt)}
                          </span>
                          <Select
                            value=""
                            onValueChange={(v) => handleBulkStatusChange(group, v as OrderStatus)}
                          >
                            <SelectTrigger className="h-8 w-40 rounded-md border-input-border bg-input text-xs text-foreground focus:ring-0">
                              <SelectValue placeholder={t("group.updateAllPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-md border-border-subtle bg-surface">
                              {STATUS_VALUES.map(s => (
                                <SelectItem key={s} value={s} className="text-xs text-foreground focus:bg-gold-subtle">
                                  {statusLabels[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* ── Items trong nhóm ── */}
                      {!isCollapsed && (
                        <Table>
                          <TableBody>
                            {group.items.map(order => (
                              <TableRow key={order.id} className="border-border-subtle transition-colors hover:bg-gold-subtle/20">
                                <TableCell className="w-28 font-mono text-xs font-bold text-foreground">
                                  ORD-{String(order.id).padStart(3, '0')}
                                </TableCell>
                                <TableCell className="text-foreground">
                                  {order.dishName ?? `Snapshot #${order.dishSnapshotId}`}
                                  {order.quantity > 1 && (
                                    <span className="ml-1 text-xs text-muted-foreground/60">×{order.quantity}</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-bold text-primary">{getTotal(order)}</TableCell>
                                <TableCell><StatusBadge status={order.status} /></TableCell>
                                <TableCell className="text-muted-foreground text-sm tabular-nums">{formatTime(order.createdAt)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => setOrderToView(order)}
                                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gold-subtle hover:text-foreground"
                                      title={t("viewDetails")}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setOrderToEdit(order)}
                                      disabled={order.status === 'Cancelled'}
                                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gold-subtle hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                      title={t("editStatus")}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <PaginationV1
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateOrderModal
        open={isCreateOpen}
        preselectedTableId={createPreselectedTable}
        onClose={() => { setIsCreateOpen(false); setCreatePreselectedTable(undefined) }}
      />
      <ViewOrderModal order={orderToView} onClose={() => setOrderToView(null)} />
      <EditOrderModal order={orderToEdit} onClose={() => setOrderToEdit(null)} />
    </div>
  )
}