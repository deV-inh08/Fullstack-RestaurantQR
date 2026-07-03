import { handleErrorApi } from "@/src/lib/utils";
import { useCreateTableMutation } from "@/src/queries/useTable";
import { useState } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/src/components/ui/dialog"
import { Button } from "@/src/components/ui/button";

// ─── Add Table modal ────────────────────────────────
export const AddTableModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [number, setNumber] = useState('')
    const [capacity, setCapacity] = useState('4')
    const createMutation = useCreateTableMutation()

    const handleSave = async () => {
        if (!number) return
        try {
            const result = await createMutation.mutateAsync({
                number: Number(number), capacity: Number(capacity), isVisibleOnReservation: true
            })
            toast.success(result.payload.message ?? 'Tạo bàn thành công')
            setNumber(''); setCapacity('4')
            onClose()
        } catch (error) { handleErrorApi({ error }) }
    }

    const inputCls = 'h-10 w-full rounded-md border border-input-border bg-input px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/20'

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="max-w-md rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">Thêm Bàn</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 p-6">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Số bàn</label>
                        <input type="number" value={number} onChange={e => setNumber(e.target.value)}
                            placeholder="1" className={`mt-1 ${inputCls}`} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sức chứa</label>
                        <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)}
                            placeholder="4" className={`mt-1 ${inputCls}`} />
                    </div>
                </div>
                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button variant="outline" onClick={onClose} className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">Hủy</Button>
                    <Button onClick={handleSave} disabled={createMutation.isPending}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold">
                        {createMutation.isPending ? 'Đang lưu...' : 'Tạo bàn'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}