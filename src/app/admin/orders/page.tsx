"use client"

import { useMemo, useState, useCallback, Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"

import { Eye, Pencil, Plus } from "lucide-react"
import { cn, formatCurrency, formatTime } from "@/src/lib/utils"
import PaginationV1 from "@/src/components/pagination/pagination_v1"
import { useGetOrders, orderKeys } from "@/src/queries/useOrder"
import { STATUS_VALUES } from "./components/status_select"
import CreateOrderModal from "./components/addOrder"
import { STATUS_ORDER_STYLE, StatusBadge, ViewOrderModal } from "./components/viewModel"
import { EditOrderModal } from "./components/editOrder"
import { OrderDto } from "@/src/schema/order.schema"
import TableStatusGrid from "./components/TableStatusGrid"
import { OrderRowSkeleton } from "@/src/components/Skeleton/skeleton"
import BillAdminRequestSection from "@/src/components/bill/BillAdminRequestSection"
import { PAGE_SIZE } from "@/src/config"

// ─── Main page ──────────────────────────────────────
export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-6">Đang tải...</div>}>
      <OrdersContent />
    </Suspense>
  )
}

function OrdersContent() {
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

  const total = data?.payload.data.total
  const pagination = {
    page: data?.payload.data.page ?? 1,
    totalPages: data?.payload.data.totalPages ?? 1,
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Orders" subtitle="Quản lý đơn hàng theo thời gian thực" />

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
              <span className="text-sm text-muted-foreground">to</span>
              <div className="relative flex items-center">
                <svg className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input type="date" value={dateTo} onChange={e => handleDateToChange(e.target.value)}
                  className="h-10 w-44 rounded-md border border-input-border bg-input pl-10 pr-3 text-sm text-foreground focus:border-primary focus:outline-none [color-scheme:dark]" />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-10 w-36 rounded-md border-input-border bg-input text-sm text-foreground focus:ring-0">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-md border-border-subtle bg-surface">
                  <SelectItem value="all" className="text-foreground focus:bg-gold-subtle">All Status</SelectItem>
                  {STATUS_VALUES.map(s => (
                    <SelectItem key={s} value={s} className="text-foreground focus:bg-gold-subtle">
                      {STATUS_ORDER_STYLE[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{total} đơn tổng</span>
            </div>

            <Button
              onClick={() => { setCreatePreselectedTable(undefined); setIsCreateOpen(true) }}
              className="h-10 gap-2 rounded-md bg-primary px-5 font-bold uppercase tracking-wide text-black shadow-md hover:shadow-gold"
            >
              <Plus className="h-4 w-4" />
              Create Order
            </Button>
          </div>

          <div className="rounded-md border border-border-subtle bg-card shadow-card">
            {isLoading ? (
              <div className="w-full">
                <div className="flex items-center gap-4 border-b border-border-subtle px-4 py-3">
                  {['ORDER ID', 'TABLE', 'GUEST', 'ITEMS', 'TOTAL', 'STATUS', 'TIME', 'ACTIONS'].map(h => (
                    <div key={h} className="flex-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</div>
                  ))}
                </div>
                <OrderRowSkeleton rows={8} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border-subtle hover:bg-transparent">
                    {['ORDER ID', 'TABLE', 'GUEST', 'ITEMS', 'TOTAL', 'STATUS', 'TIME', 'ACTIONS'].map(h => (
                      <TableHead key={h} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                        Không có đơn hàng nào
                      </TableCell>
                    </TableRow>
                  )}
                  {orders.map(order => (
                    <TableRow key={order.id} className="border-border-subtle transition-colors hover:bg-gold-subtle/20">
                      <TableCell className="font-mono font-bold text-foreground">
                        ORD-{String(order.id).padStart(3, '0')}
                      </TableCell>
                      <TableCell className="text-foreground">Table {order.tableNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{order.guestName}</TableCell>
                      <TableCell className="text-foreground">
                        {order.dishName ?? `Snapshot #${order.dishSnapshotId}`}
                      </TableCell>
                      <TableCell className="font-bold text-primary">{getTotal(order)}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm tabular-nums">{formatTime(order.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setOrderToView(order)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gold-subtle hover:text-foreground"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setOrderToEdit(order)}
                            disabled={order.status === 'Cancelled'}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gold-subtle hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Chỉnh sửa trạng thái"
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