import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/src/components/ui/alert-dialog'
import { AccountItem } from './table_account'
import { useDeleteEmployeeMutation } from '@/src/queries/useAccount'
import { toast } from 'sonner'
import { handleErrorApi } from '@/src/lib/utils'

const DeleteAccountDialog = ({
    account,
    onClose
}: {
    account: AccountItem | null
    onClose: () => void
}) => {
    const deleteMutation = useDeleteEmployeeMutation()

    const handleDelete = async () => {
        if (!account) return
        try {
            const result = await deleteMutation.mutateAsync(account.id)
            toast.success(result.payload.message ?? 'Đã xóa tài khoản')
        } catch (error) {
            handleErrorApi({ error })
        } finally {
            onClose()
        }
    }

    return (
        <AlertDialog open={Boolean(account)} onOpenChange={(open) => { if (!open) onClose() }}>
            <AlertDialogContent className="border-border-subtle bg-card">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Xóa tài khoản?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Tài khoản{' '}
                        <span className="rounded bg-foreground px-1 font-semibold text-background">
                            {account?.name}
                        </span>{' '}
                        sẽ bị xóa vĩnh viễn.
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

export default DeleteAccountDialog;