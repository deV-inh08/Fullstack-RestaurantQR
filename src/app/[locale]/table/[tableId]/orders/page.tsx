'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/src/i18n/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { cn, formatCurrency } from '@/src/lib/utils'
import { isGuestLoggedIn } from '@/src/lib/guest-session'
import { useGetMyOrders, guestKeys } from '@/src/queries/useGuest'
import type { OrderDto } from '@/src/schema/order.schema'
import { useOrderSignalR } from '@/src/hooks/useOrderSignalR'
import BillGuestRequestSection from '@/src/components/bill/BillGuestRequestSection'

const STATUS_CLS: Record<string, string> = {
  Pending: 'bg-white/8 text-foreground border border-foreground/20',
  Preparing: 'bg-primary/15 text-primary',
  Served: 'bg-green-500/20 text-green-400',
  Cancelled: 'bg-destructive/20 text-destructive',
}

export function StatusPill({ status }: { status: string }) {
  const t = useTranslations('Guest.OrderStatus')
  const cls = STATUS_CLS[status] ?? STATUS_CLS.Pending
  const label = STATUS_CLS[status] ? t(status as any) : status
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider', cls)}>
      {label}
    </span>
  )
}

export default function GuestOrdersPage() {
  const t = useTranslations('Guest.Orders')
  const tStatus = useTranslations('Guest.OrderStatus')
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
      toast.error(t('sessionExpired'))
      router.replace(`/table/${tableNumber}/welcome`)
    }
  }, [error, tableNumber, router, t])

  const handleOrderStatusUpdated = useCallback(
    (order: OrderDto) => {
      if (STATUS_CLS[order.status]) {
        toast(t('statusUpdateToast', { dish: order.dishName ?? t('unnamedDish'), status: tStatus(order.status as any) }), {
          description: `x${order.quantity} · ${formatCurrency(order.dishPrice * order.quantity)}`,
          duration: 5000,
        })
      }
      queryClient.invalidateQueries({ queryKey: guestKeys.myOrders(tableNumber) })
    },
    [queryClient, tableNumber, t, tStatus]
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
      <header className="flex items-center gap-3 border-b border-foreground/10 p-4">
        <Link
          href={`/table/${tableNumber}`}
          aria-label={t('backAria')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">{t('title', { number: tableNumber })}</h1>
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
