import { useEffect, useState } from "react";
import { OrderStatus, STATUS_LABELS, STATUS_VALUES } from "./status_select";
import { useUpdateOrderStatusMutation } from "@/src/queries/useOrder";
import { toast } from "sonner";
import { handleErrorApi } from "@/src/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/src/components/ui/alert-dialog";
import { Button } from "@/src/components/ui/button";
import { OrderDto } from "@/src/schema/order.schema";

// ─── Edit Order Modal ─────────────────────────────────
export const EditOrderModal = ({ order, onClose }: { order: OrderDto | null; onClose: () => void }) => {
    const [status, setStatus] = useState<OrderStatus>((order?.status as OrderStatus) ?? 'Pending')
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const updateStatusMutation = useUpdateOrderStatusMutation()

    // Sync state when order changes
    useEffect(() => {
        if (order) {
            setStatus(order.status as OrderStatus)
        }
    }, [order])

    const handleSave = async () => {
        if (!order) return
        try {
            await updateStatusMutation.mutateAsync({ id: order.id, status })
            toast.success('Đã cập nhật trạng thái')
            onClose()
        } catch (error) { handleErrorApi({ error }) }
    }

    const handleCancel = async () => {
        if (!order) return
        try {
            await updateStatusMutation.mutateAsync({ id: order.id, status: 'Cancelled' })
            toast.success('Đã hủy đơn hàng')
            setShowCancelConfirm(false)
            onClose()
        } catch (error) { handleErrorApi({ error }) }
    }

    return (
        <>
            <Dialog open={Boolean(order) && !showCancelConfirm} onOpenChange={(v) => { if (!v) onClose() }}>
                <DialogContent className="max-w-md rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                    <DialogHeader className="border-b border-border-subtle p-6">
                        <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                            Cập nhật đơn #{order && String(order.id).padStart(3, '0')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 p-6">
                        {/* Order summary — read-only */}
                        <div className="rounded-md border border-border-subtle bg-surface p-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Bàn</span>
                                <span className="text-foreground font-medium">Bàn {order?.tableNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Món</span>
                                <span className="text-foreground font-medium">
                                    {order?.dishName ?? `Snapshot #${order?.dishSnapshotId}`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số lượng</span>
                                <span className="text-foreground font-medium">x{order?.quantity}</span>
                            </div>
                        </div>

                        {/* Status update */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Trạng thái
                            </label>
                            <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                                <SelectTrigger className="h-10 w-full rounded-md border-input-border bg-input text-foreground focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-md border-border-subtle bg-surface">
                                    {STATUS_VALUES.filter(s => s !== 'Cancelled').map(s => (
                                        <SelectItem key={s} value={s} className="text-foreground focus:bg-gold-subtle">
                                            {STATUS_LABELS[s]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <AlertDialogFooter className="border-t border-border-subtle p-6 flex items-center justify-between">
                        {/* Cancel order = "Delete" semantics */}
                        <Button
                            variant="outline"
                            onClick={() => setShowCancelConfirm(true)}
                            disabled={order?.status === 'Cancelled'}
                            className="rounded-md border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                            Hủy đơn
                        </Button>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose}
                                className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                                Đóng
                            </Button>
                            <Button onClick={handleSave} disabled={updateStatusMutation.isPending}
                                className="rounded-md bg-primary font-bold uppercase tracking-wide text-black shadow-md hover:shadow-gold">
                                {updateStatusMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                            </Button>
                        </div>
                    </AlertDialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm cancel */}
            <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                <AlertDialogContent className="border-border-subtle bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">Hủy đơn #{order && String(order.id).padStart(3, '0')}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Đơn sẽ bị đánh dấu <strong className="text-destructive">Cancelled</strong>. Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                            Giữ lại
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={updateStatusMutation.isPending}
                            className="bg-destructive text-white hover:bg-destructive/90">
                            {updateStatusMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}