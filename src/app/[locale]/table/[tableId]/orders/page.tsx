'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/src/i18n/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { cn, formatCurrency } from '@/src/lib/utils'
import { isGuestLoggedIn } from '@/src/lib/guest-session'
import { useGetMyOrders, guestKeys } from '@/src/queries/useGuest'
import type { OrderDto } from '@/src/schema/order.schema'
import { useOrderSignalR } from '@/src/hooks/useOrderSignalR'
import BillGuestRequestSection from '@/src/components/bill/BillGuestRequestSection'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Pending: { label: 'Chờ xử lý', cls: 'bg-white/8 text-foreground border border-foreground/20' },
  Preparing: { label: 'Đang nấu', cls: 'bg-primary/15 text-primary' },
  Served: { label: 'Đã phục vụ', cls: 'bg-green-500/20 text-green-400' },
  Cancelled: { label: 'Đã hủy', cls: 'bg-destructive/20 text-destructive' },
}

export function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

export default function GuestOrdersPage() {
  const [billPaid, setBillPaid] = useState(false)
  const params = useParams()
  const router = useRouter()
  const tableNumber = params.tableId as string
  const loggedIn = isGuestLoggedIn()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!loggedIn) router.replace(`/table/${tableNumber}/welcome`)
  }, [tableNumber, router, loggedIn])

  // Không còn getGuestAccessToken() — cookie guestAccessToken tự được BFF
  // gắn vào request.
  const { data, isLoading, error } = useGetMyOrders(tableNumber)


  useEffect(() => {
    if ((error as any)?.status === 401) {
      toast.error('Phiên đã hết hạn. Vui lòng quét QR lại.')
      router.replace(`/table/${tableNumber}/welcome`)
    }
  }, [error, tableNumber, router])

  const handleOrderStatusUpdated = useCallback(
    (order: OrderDto) => {
      const cfg = STATUS_CONFIG[order.status]
      if (cfg) {
        toast(`${order.dishName ?? 'Món ăn'} — ${cfg.label}`, {
          description: `x${order.quantity} · ${formatCurrency(order.dishPrice * order.quantity)}`,
          duration: 5000,
        })
      }
      queryClient.invalidateQueries({ queryKey: guestKeys.myOrders(tableNumber) })
    },
    [queryClient, tableNumber]
  )

  // Token thật được hook tự lấy qua /api/guest/realtime-token, không còn
  // nhận token làm tham số nữa.
  useOrderSignalR({
    role: 'guest',
    tableNumber: Number(tableNumber),
    enabled: loggedIn,
    onOrderStatusUpdated: handleOrderStatusUpdated,
    onBillPaid: () => setBillPaid(true),
  })

  const orders = data?.payload.data ?? []


  return (
    <div className="flex min-h-screen flex-col pb-32">
      <header className="border-b border-foreground/10 p-4">
        <h1 className="text-lg font-bold">Đơn hàng của bạn — Bàn {tableNumber}</h1>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <ul className="space-y-3 p-4">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between rounded-xl border border-foreground/10 p-3">
              <div>
                <p className="font-semibold">{order.dishName}</p>
                <p className="text-xs text-foreground/60">x{order.quantity} · {formatCurrency(order.dishPrice * order.quantity)}</p>
              </div>
              <StatusPill status={order.status} />
            </li>
          ))}
        </ul>
      )}

      {!isLoading && orders.length > 0 && (
        <BillGuestRequestSection orders={orders as any} billPaid={billPaid} />
      )}
    </div>
  )
}
