'use client'

import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useOrderSignalR } from '@/src/hooks/useOrderSignalR'
import { useOrderNotificationStore } from '@/src/hooks/useOrderNotification'
import { useAppProviderStore } from '@/src/components/app-provider'
import { formatCurrency } from '@/src/lib/utils'
import type { OrderDto } from '@/src/schema/order.schema'
import { billKeys } from '@/src/queries/useBill'
import { tableKeys } from '@/src/queries/useTable'
import { showBillRequestToast } from './bill/BillRequestToast'
import type { TableDto } from '@/src/schema/table.schema'

export function AdminSignalRProvider() {
    const role = useAppProviderStore((state) => state.role)
    const addOrderCreated = useOrderNotificationStore((s) => s.addOrderCreated)
    const queryClient = useQueryClient()

    // Không còn getAccessTokenFromLocalStorage() — chỉ cần biết user hiện
    // tại có phải staff không, token thật được hook tự lấy qua /api/realtime-token.
    const isStaff = role === 'Staff' || role === 'Admin' || role === 'SuperAdmin'

    const handleOrderCreated = (order: OrderDto) => {
        addOrderCreated(order)
        toast(`Order mới — Bàn ${order.tableNumber}`, {
            description: `${order.dishName} x${order.quantity} — ${formatCurrency(order.dishPrice * order.quantity)}`,
            duration: 6000,
            action: { label: 'Xem', onClick: () => { window.location.href = '/admin/orders' } },
        })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
    }

    const handleTableStatusChanged = (table: TableDto) => {
        queryClient.invalidateQueries({ queryKey: tableKeys.allTables })
        queryClient.invalidateQueries({ queryKey: tableKeys.detail(table.id) })
    }

    useOrderSignalR({
        role: 'staff',
        enabled: isStaff,
        onOrderCreated: handleOrderCreated,
        onOrderStatusUpdated: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
        onTableStatusChanged: handleTableStatusChanged,
        onBillRequested: (bill) => {
            queryClient.invalidateQueries({ queryKey: billKeys.all })
            showBillRequestToast(bill, () => { window.location.href = '/admin/orders' })
        },
        onBillPaid: () => queryClient.invalidateQueries({ queryKey: billKeys.all }),
    })

    return null
}
