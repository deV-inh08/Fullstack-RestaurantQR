import { useTranslations } from "next-intl";
import { OrderDto } from "@/src/schema/order.schema";
import { STATUS_VALUES } from "./status_select";
import { cn, formatCurrency, formatTime } from "@/src/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { OrderStatus } from "./status_select";
// ─── Constants ───────────────────────────────────────
const STATUS_ORDER_CLS: Record<OrderStatus, { cls: string; dotCls: string }> = {
    Pending: { cls: 'border border-foreground/30 text-foreground', dotCls: 'bg-foreground/60' },
    Preparing: { cls: 'bg-primary text-black', dotCls: 'bg-black' },
    Served: { cls: 'bg-green-500 text-white', dotCls: 'bg-white' },
    Cancelled: { cls: 'bg-destructive/20 text-destructive border border-destructive/40', dotCls: 'bg-destructive' },
}

// Nhãn + style badge trạng thái đơn hàng — dịch theo locale, dùng trong Component.
export function useOrderStatusBadgeConfig(): Record<OrderStatus, { label: string; cls: string; dotCls: string }> {
    const t = useTranslations('Admin.OrderStatusBadge')
    return {
        Pending: { label: t('pending'), ...STATUS_ORDER_CLS.Pending },
        Preparing: { label: t('preparing'), ...STATUS_ORDER_CLS.Preparing },
        Served: { label: t('served'), ...STATUS_ORDER_CLS.Served },
        Cancelled: { label: t('cancelled'), ...STATUS_ORDER_CLS.Cancelled },
    }
}

export function StatusBadge({ status }: { status: string }) {
    const statusStyle = useOrderStatusBadgeConfig()
    const cfg = statusStyle[status as OrderStatus]
    if (!cfg) return <span className="text-xs text-muted-foreground">{status}</span>
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider', cfg.cls)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotCls)} />
            {cfg.label}
        </span>
    )
}

// ─── View Order Modal ─────────────────────────────────
export function ViewOrderModal({ order, onClose }: { order: OrderDto | null; onClose: () => void }) {
    if (!order) return null

    return (
        <Dialog open={Boolean(order)} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="max-w-md rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                        Chi tiết đơn #{String(order.id).padStart(3, '0')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 p-6 text-sm">
                    {[
                        ['Bàn', `Bàn ${order.tableNumber}`],
                        ['Khách', order.guestName],
                        ['Món', order.dishName ?? `Snapshot #${order.dishSnapshotId}`],
                        ['Số lượng', `x${order.quantity}`],
                        ['Thành tiền', order.dishPrice ? formatCurrency(order.dishPrice * order.quantity) : '—'],
                        ['Giờ tạo', formatTime(order.createdAt)],
                    ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between border-b border-border-subtle pb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{k}</span>
                            <span className="text-foreground font-medium">{v}</span>
                        </div>
                    ))}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trạng thái</span>
                        <StatusBadge status={order.status} />
                    </div>
                </div>

                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button variant="outline" onClick={onClose}
                        className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                        Đóng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}