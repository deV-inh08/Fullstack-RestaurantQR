import { handleErrorApi } from "@/src/lib/utils"
import { useDeleteReservationMutation } from "@/src/queries/useReservation"
import { ReservationDto } from "@/src/schema/reservation.schema"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/src/components/ui/alert-dialog'

// ─── Delete dialog ────────────────────────────────────────────────────────────
function DeleteReservationDialog({
    reservation,
    onClose,
}: {
    reservation: ReservationDto | null
    onClose: () => void
}) {
    const deleteMutation = useDeleteReservationMutation()

    const handleDelete = async () => {
        if (!reservation) return
        try {
            await deleteMutation.mutateAsync(reservation.id)
            toast.success('Đã xóa lịch đặt')
        } catch (error) {
            handleErrorApi({ error })
        } finally {
            onClose()
        }
    }

    return (
        <AlertDialog open={Boolean(reservation)} onOpenChange={open => { if (!open) onClose() }}>
            <AlertDialogContent className="border-border-subtle bg-card">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Xóa lịch đặt?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Lịch đặt của{' '}
                        <span className="font-semibold text-foreground">{reservation?.guestName}</span>{' '}
                        sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                        Hủy
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="bg-destructive text-white hover:bg-destructive/90"
                    >
                        {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}


export default DeleteReservationDialog;