import { formatCurrency, handleErrorApi } from "@/src/lib/utils"
import { useGetDishes } from "@/src/queries/useDish"
import { useCreateOrderMutation } from "@/src/queries/useOrder"
import { useGetTables } from "@/src/queries/useTable"
import { useState } from "react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/src/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select"
import { Button } from "@/src/components/ui/button"
import dishSnapshotApiRequest from "@/src/apiRequests/dish_snapshot.request"
// ─── Create Order Modal ───────────────────────────────
export default function CreateOrderModal({
    open,
    preselectedTableId,
    onClose,
}: {
    open: boolean
    preselectedTableId?: number
    onClose: () => void
}) {
    const [tableId, setTableId] = useState<string>(preselectedTableId ? String(preselectedTableId) : '')
    const [dishId, setDishId] = useState<string>('')
    const [qty, setQty] = useState<string>('1')

    const { data: tablesData } = useGetTables({ page: 1, pageSize: 50 })
    const { data: dishesData } = useGetDishes()
    const createMutation = useCreateOrderMutation()

    const tables = tablesData?.payload.data.data ?? []
    const dishes = (dishesData?.payload.data.data ?? []).filter(d => d.status === 'Available')

    const handleSave = async () => {
        if (!tableId || !dishId) {
            toast.error('Vui lòng chọn bàn và món ăn')
            return
        }
        try {
            const snapshotRes = await dishSnapshotApiRequest.getId(Number(dishId))
            const { id: dishSnapshotId } = snapshotRes.payload.data
            // Backend: CreateOrderAsStaffRequest { tableId, dishSnapshotId, quantity }
            // For staff-created orders we pass dishId as dishSnapshotId — the backend
            // resolves to the latest snapshot of that dish.
            await createMutation.mutateAsync({
                tableId: Number(tableId),
                dishSnapshotId: Number(dishSnapshotId),
                quantity: Math.max(1, Number(qty)),
            })
            toast.success('Đã tạo đơn hàng')
            setTableId(''); setDishId(''); setQty('1')
            onClose()
        } catch (error) {
            handleErrorApi({ error })
        }
    }

    const triggerCls = 'h-10 w-full rounded-md border-input-border bg-input text-foreground focus:ring-0'
    const inputCls = 'h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20'
    const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground'

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="max-w-md rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                        Tạo Đơn Hàng
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 p-6">
                    {/* Table */}
                    <div>
                        <label className={labelCls}>Bàn</label>
                        <Select value={tableId} onValueChange={setTableId}>
                            <SelectTrigger className={triggerCls}><SelectValue placeholder="Chọn bàn..." /></SelectTrigger>
                            <SelectContent className="rounded-md border-border-subtle bg-surface">
                                {tables.map(t => (
                                    <SelectItem key={t.id} value={String(t.id)} className="text-foreground focus:bg-gold-subtle">
                                        Bàn {t.number} — {t.status === 'Available' ? 'Trống' : t.status === 'Occupied' ? 'Có khách' : 'Ẩn'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dish */}
                    <div>
                        <label className={labelCls}>Món ăn</label>
                        <Select value={dishId} onValueChange={setDishId}>
                            <SelectTrigger className={triggerCls}><SelectValue placeholder="Chọn món..." /></SelectTrigger>
                            <SelectContent className="rounded-md border-border-subtle bg-surface max-h-60">
                                {dishes.map(d => (
                                    <SelectItem key={d.id} value={String(d.id)} className="text-foreground focus:bg-gold-subtle">
                                        <span className="flex items-center justify-between gap-4">
                                            <span>{d.name}</span>
                                            <span className="text-primary font-semibold">{formatCurrency(d.price)}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className={labelCls}>Số lượng</label>
                        <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                            className={inputCls}
                        />
                    </div>
                </div>

                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button variant="outline" onClick={onClose}
                        className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={createMutation.isPending}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-black shadow-md hover:shadow-gold">
                        {createMutation.isPending ? 'Đang tạo...' : 'Tạo đơn'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
