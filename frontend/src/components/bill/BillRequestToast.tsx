'use client'

/**
 * showBillRequestToast — call this inside AdminSignalRProvider when a
 * "BillRequested" SignalR event arrives.
 *
 * Usage:
 *   import { showBillRequestToast } from '@/src/components/admin/BillRequestToast'
 *   // Inside the SignalR handler:
 *   showBillRequestToast(bill, () => router.push('/admin/orders'))
 */

import { toast } from 'sonner'
import type { BillDto } from '@/src/schema/bill.schema'

function formatVnd(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND'
}

export function showBillRequestToast(
    bill: BillDto,
    onView?: () => void,
) {
    toast(
        `Yêu cầu thanh toán — Bàn ${bill.tableNumber}`,
        {
            description: `${bill.guestName} · ${bill.orders.length} món · ${formatVnd(bill.totalAmount)}`,
            duration: 8000,
            icon: (
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                </div>
            ),
            action: onView
                ? {
                    label: 'XEM',
                    onClick: onView,
                }
                : undefined,
            style: {
                borderLeft: '3px solid #FFC000',
            },
        }
    )
}