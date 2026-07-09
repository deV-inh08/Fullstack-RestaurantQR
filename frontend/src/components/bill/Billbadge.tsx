'use client'

/**
 * BillBadge — shows count of "Requested" bills on admin sidebar.
 * Drop-in replacement for the existing Orders nav badge.
 * Usage: import in admin-sidebar.tsx and place next to "Orders" label.
 */

import { useGetBills } from '@/src/queries/useBill'

export function BillBadge() {
    const { data } = useGetBills(1, 50)

    const count = (data?.payload?.data?.data ?? []).filter(
        (b) => b.status === 'Requested'
    ).length

    if (count === 0) return null

    return (
        <span
            className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums"
            style={{ animation: 'billPulse 2s ease-in-out infinite' }}
        >
            {count > 9 ? '9+' : count}
            <style>{`
                @keyframes billPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(255,192,0,0.4); }
                    50% { box-shadow: 0 0 0 6px rgba(255,192,0,0); }
                }
            `}</style>
        </span>
    )
}