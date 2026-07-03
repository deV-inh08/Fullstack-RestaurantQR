import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/src/components/ui/alert-dialog'
import { handleErrorApi } from '@/src/lib/utils';
import { useDeleteTableMutation } from "@/src/queries/useTable";
import { TableDto } from '@/src/schema/table.schema';
import { toast } from 'sonner';

// ─── Delete dialog ──────────────────────────────────
export const DeleteTableDialog = ({ table, onClose }: { table: TableDto | null; onClose: () => void }) => {
    const deleteMutation = useDeleteTableMutation()
    return (
        <AlertDialog open={Boolean(table)} onOpenChange={(open) => { if (!open) onClose() }}>
            <AlertDialogContent className="border-border-subtle bg-card">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Xóa bàn {table?.number}?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Hành động này không thể hoàn tác. Tất cả lịch sử order liên quan sẽ bị ảnh hưởng.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">Hủy</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteMutation.isPending}
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={async () => {
                            if (!table) return
                            try {
                                await deleteMutation.mutateAsync(table.id)
                                toast.success('Đã xóa bàn')
                            } catch (error) { handleErrorApi({ error }) }
                            finally { onClose() }
                        }}>
                        {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}