'use client'

import { cn, formatCurrency } from "@/src/lib/utils"
import { useRequestBillMutation } from "@/src/queries/useBill"
import { OrderDto } from "@/src/schema/order.schema"
import { Loader2, Receipt } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type BillState = 'idle' | 'requesting' | 'requested'

export default function BillGuestRequestSection({
    orders,
    billPaid = false,
}: {
    orders: OrderDto[]
    billPaid?: boolean
}) {
    const [billState, setBillState] = useState<BillState>('idle')
    const requestBillMutation = useRequestBillMutation()



    const activeOrders = orders.filter(o => o.status !== 'Cancelled')
    const total = activeOrders.reduce((s, o) => s + o.dishPrice * o.quantity, 0)
    const pendingCount = activeOrders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length

    if (activeOrders.length === 0) return null

    const handleRequest = async () => {
        if (billState !== 'idle') return
        setBillState('requesting')
        try {
            await requestBillMutation.mutateAsync()
            setBillState('requested')
            toast.success('Đã gửi yêu cầu thanh toán. Nhân viên sẽ đến ngay!')
        } catch {
            setBillState('idle')
            toast.error('Không thể gửi yêu cầu. Vui lòng thử lại.')
        }
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gold-border bg-background/95 backdrop-blur">
            <div className="mx-auto max-w-[440px] px-4 py-3">

                {/* Summary */}
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {pendingCount > 0 ? `${pendingCount} món đang xử lý` : 'Tất cả đã phục vụ'}
                    </p>
                    <p className="text-lg font-black text-primary">
                        {formatCurrency(total)}
                    </p>
                </div>

                {billPaid ? (
                    <div className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-green-500/30 bg-green-500/8 py-3.5 text-sm font-bold uppercase tracking-wide text-green-400">
                        ✓ Đã thanh toán — Cảm ơn quý khách!
                    </div>
                ) : billState === 'idle' ? (
                    <button
                        onClick={handleRequest}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-black shadow-md transition-all hover:shadow-gold active:scale-[0.98]"
                    >
                        <Receipt className="h-4 w-4" />
                        Yêu cầu thanh toán
                    </button>
                ) : billState === 'requesting' ? (
                    <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/20 py-3.5 text-sm font-bold text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang gửi...
                    </div>
                ) : billState === 'requested' && (
                    <div className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-primary/30 bg-primary/8 py-3.5 text-sm font-bold uppercase tracking-wide text-primary">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        Đã yêu cầu — Chờ nhân viên
                    </div>
                )}

            </div>
        </div>
    )
}