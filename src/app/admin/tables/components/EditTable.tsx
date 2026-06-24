import envConfig from "@/src/config";
import { handleErrorApi } from "@/src/lib/utils";
import { useResetTableMutation, useUpdateTableStatusMutation, useUpdateTableVisibilityMutation } from "@/src/queries/useTable";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { TableDto } from "@/src/schema/table.schema";
import { Button } from "@/src/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw } from "lucide-react";
import { Switch } from "@/src/components/ui/switch";


const STATUS_LABELS: Record<string, string> = {
    Available: 'Trống', Occupied: 'Có khách', Hidden: 'Ẩn'
}
// ─── Edit Table modal ───────────────────────────────
export const EditTableModal = ({ table, onClose }: { table: TableDto | null; onClose: () => void }) => {
    const [status, setStatus] = useState(table?.status ?? 'Available')
    const [isVisible, setIsVisible] = useState(table?.isVisibleOnReservation ?? true)
    const updateStatusMutation = useUpdateTableStatusMutation()
    const resetMutation = useResetTableMutation()
    const updateVisibilityMutation = useUpdateTableVisibilityMutation()

    useEffect(() => {
        if (table) {
            setStatus(table.status)
            setIsVisible(table.isVisibleOnReservation)
        }
    }, [table])

    const url = table ? `${envConfig.NEXT_PUBLIC_URL}/table/${table.id}/welcome` : ''
    console.log('url_____________________', url)
    const handleSave = async () => {
        if (!table) return
        try {
            await Promise.all([
                updateStatusMutation.mutateAsync({ id: table.id, status: status as any }),
                // Chỉ gọi visibility nếu đã thay đổi so với giá trị hiện tại
                isVisible !== table.isVisibleOnReservation
                    ? updateVisibilityMutation.mutateAsync({ tableNumber: table.number, isVisibleOnReservation: isVisible })
                    : Promise.resolve()
            ])
            toast.success('Cập nhật trạng thái thành công')
            onClose()
        } catch (error) { handleErrorApi({ error }) }
    }

    const handleReset = async () => {
        if (!table) return
        try {
            await resetMutation.mutateAsync(table.id)
            toast.success('Đã reset bàn — QR code mới đã được tạo')
            onClose()
        } catch (error) { handleErrorApi({ error }) }
    }

    return (
        <Dialog open={Boolean(table)} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="max-w-md rounded-lg border-border-subtle bg-card p-0 shadow-modal">
                <DialogHeader className="border-b border-border-subtle p-6">
                    <DialogTitle className="text-lg font-bold uppercase tracking-wide text-foreground">
                        Bàn {table?.number}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 p-6">
                    {/* QR large */}
                    {table && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-white p-3 rounded-md">
                                <QRCodeSVG value={url} size={160} level="H" bgColor="#FFFFFF" fgColor="#000000" />
                            </div>
                            <p className="text-xs text-muted-foreground break-all text-center">{url}</p>
                            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMutation.isPending}
                                className="gap-2 border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                                <RefreshCw className="h-3.5 w-3.5" />
                                {resetMutation.isPending ? 'Đang reset...' : 'Reset QR Code'}
                            </Button>
                        </div>
                    )}
                    {/* Visibility toggle — NEW */}
                    <div className="flex items-center justify-between rounded-md border border-border-subtle p-3">
                        <div>
                            <p className="text-sm font-medium text-foreground">Hiển thị khi đặt bàn</p>
                            <p className="text-xs text-muted-foreground">
                                Bàn này xuất hiện trong trang đặt bàn trực tuyến
                            </p>
                        </div>
                        <Switch
                            checked={isVisible}
                            onCheckedChange={setIsVisible}
                        />
                    </div>
                    {/* Status */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trạng thái</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="mt-1 h-10 w-full rounded-md border-input-border bg-input text-foreground focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-md border-border-subtle bg-surface">
                                {['Available', 'Occupied', 'Hidden'].map(s => (
                                    <SelectItem key={s} value={s} className="text-foreground focus:bg-gold-subtle">
                                        {STATUS_LABELS[s]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="border-t border-border-subtle p-6">
                    <Button variant="outline" onClick={onClose} className="rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">Hủy</Button>
                    <Button onClick={handleSave} disabled={updateStatusMutation.isPending}
                        className="rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold">
                        {updateStatusMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}