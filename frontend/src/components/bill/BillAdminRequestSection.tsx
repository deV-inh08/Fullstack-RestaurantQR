'use client'

import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { cn, formatCurrency, handleErrorApi } from '@/src/lib/utils'
import { useConfirmBillMutation, useGetBills } from '@/src/queries/useBill'
import type { BillDto, BillStatus } from '@/src/schema/bill.schema'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/dialog'
import { toast } from 'sonner'
import { useGetMe } from '@/src/queries/useAccount'

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

// ─── Status stepper inside modal ─────────────────────────────────────────────

const STATUS_STEPS: { key: BillStatus; label: string }[] = [
    { key: 'Unpaid', label: 'UNPAID' },
    { key: 'Requested', label: 'REQUESTED' },
    { key: 'Paid', label: 'PAID' },
]

function StatusStepper({ status }: { status: BillStatus }) {
    const activeIdx = STATUS_STEPS.findIndex(s => s.key === status)
    return (
        <div className="flex items-center gap-2">
            {STATUS_STEPS.map((step, idx) => {
                const isActive = idx === activeIdx
                return (
                    <span key={step.key} className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
                        isActive && step.key === 'Requested' && 'border border-primary/40 bg-primary/10 text-primary',
                        isActive && step.key === 'Paid' && 'border border-green-500/40 bg-green-500/10 text-green-400',
                        isActive && step.key === 'Unpaid' && 'border border-foreground/20 bg-white/5 text-foreground',
                        !isActive && 'border border-white/8 text-muted-foreground/40',
                    )}>
                        {isActive && (
                            <span className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                step.key === 'Requested' && 'bg-primary',
                                step.key === 'Paid' && 'bg-green-400',
                                step.key === 'Unpaid' && 'bg-foreground',
                            )} />
                        )}
                        {step.label}
                    </span>
                )
            })}
        </div>
    )
}

// ─── PayBillModal ─────────────────────────────────────────────────────────────

function PayBillModal({ bill, onClose }: { bill: BillDto | null; onClose: () => void }) {
    const confirmMutation = useConfirmBillMutation()
    const { data: meData } = useGetMe()
    const accountId = meData?.payload.data.id

    const handleConfirm = async () => {
        if (!bill) return
        if (!accountId) return toast.error('Không lấy được thông tin tài khoản')
        try {
            await confirmMutation.mutateAsync({ id: bill.id, accountId })
            toast.success(`Đã xác nhận thanh toán bàn ${bill.tableNumber}`)
            onClose()
        } catch (error) {
            handleErrorApi({ error })
        }
    }

    const nonCancelledOrders = bill?.orders.filter(o => o.status !== 'Cancelled') ?? []

    return (
        <Dialog open={Boolean(bill)} onOpenChange={open => { if (!open) onClose() }}>
            <DialogContent className="max-w-md rounded-xl border-border-subtle bg-card p-0 shadow-modal">
                {/* Header */}
                <DialogHeader className="border-b border-border-subtle px-6 py-5">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                            Thanh toán Bàn {bill?.tableNumber}
                        </DialogTitle>
                        {bill && <StatusStepper status={bill.status as BillStatus} />}
                    </div>
                    {bill?.guestName && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            Khách: <span className="font-medium text-foreground">{bill.guestName}</span>
                        </p>
                    )}
                </DialogHeader>

                {/* Order table */}
                <div className="px-6 py-4">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-subtle">
                                {['Món', 'SL', 'Đơn giá', 'T. Tiền'].map(h => (
                                    <th key={h} className={cn(
                                        'pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground',
                                        h === 'Món' ? 'text-left' : 'text-right'
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {nonCancelledOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                                        Không có món nào
                                    </td>
                                </tr>
                            ) : (
                                nonCancelledOrders.map((item, i) => (
                                    <tr key={i} className="border-b border-white/4 last:border-0">
                                        <td className="py-2.5 pr-4 text-sm text-foreground">{item.dishName}</td>
                                        <td className="py-2.5 pr-4 text-right text-sm text-muted-foreground">×{item.quantity}</td>
                                        <td className="py-2.5 pr-4 text-right text-sm text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                                        <td className="py-2.5 text-right text-sm font-semibold text-foreground">{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Total */}
                <div className="mx-6 mb-4 flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tổng cộng</span>
                    <span className="text-2xl font-black tracking-tight text-primary">
                        {formatCurrency(bill?.totalAmount ?? 0)}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 border-t border-border-subtle px-6 py-5">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-border-subtle bg-transparent py-3 text-sm font-bold uppercase tracking-wide text-foreground transition-colors hover:bg-gold-subtle"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={confirmMutation.isPending || bill?.status === 'Paid'}
                        className={cn(
                            'flex-[2] rounded-lg py-3 text-sm font-bold uppercase tracking-wide transition-all',
                            bill?.status === 'Paid'
                                ? 'cursor-not-allowed bg-green-500/20 text-green-400'
                                : 'bg-primary text-primary-foreground shadow-md hover:shadow-gold disabled:opacity-60',
                        )}
                    >
                        {confirmMutation.isPending
                            ? 'Đang xử lý...'
                            : bill?.status === 'Paid'
                                ? '✓ Đã thanh toán'
                                : 'Xác nhận thanh toán'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}


export default function BillAdminRequestSection() {
    const [selectedBill, setSelectedBill] = useState<BillDto | null>(null)
    const { data } = useGetBills(1, 50)

    const requestedBills = (data?.payload?.data?.data ?? []).filter(
        b => b.status === 'Requested'
    )

    if (requestedBills.length === 0) return null

    return (
        <>
            <section className="mb-6">
                {/* Header */}
                <div className="mb-3 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                        Yêu cầu thanh toán
                    </h2>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-black">
                        {requestedBills.length}
                    </span>
                </div>

                {/* Bill cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {requestedBills.map(bill => (
                        <button
                            key={bill.id}
                            onClick={() => setSelectedBill(bill)}
                            className={cn(
                                'flex flex-col gap-2 rounded-xl border p-4 text-left transition-all',
                                'border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
                            )}
                        >
                            {/* Table + status dot */}
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-black leading-none text-foreground">
                                    {bill.tableNumber}
                                </span>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                                </span>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Bàn
                                </p>
                                <p className="truncate text-xs font-medium text-foreground">
                                    {bill.guestName}
                                </p>
                            </div>

                            <div className="flex items-end justify-between">
                                <span className="text-base font-black text-primary">
                                    {formatCurrency(bill.totalAmount)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatTime(bill.createdAt)}
                                </span>
                            </div>

                            <div className="w-full rounded-lg bg-primary py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-black">
                                Xác nhận thanh toán
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="mb-6 border-t border-border-subtle" />

            <PayBillModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
        </>
    )
}