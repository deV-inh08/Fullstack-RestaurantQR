import { AccountListResType } from "@/src/schema/account.schema"
import { Button } from "@/src/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { useContext } from "react"
import { AccountTableContext } from "./table_account"

// ─── Actions ────────────────────────────────────────
const AccountActions = ({ account }: { account: AccountListResType["data"][0] }) => {
    const { setAccountIdEdit, setAccountToDelete } = useContext(AccountTableContext)
    return (
        <div className="flex items-center justify-end gap-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setAccountIdEdit(account.id)}
                className="h-8 w-8 rounded-md text-foreground hover:bg-gold-subtle hover:text-foreground"
            >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Sửa</span>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setAccountToDelete(account)}
                className="h-8 w-8 rounded-md text-foreground hover:bg-destructive/20 hover:text-destructive"
            >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Xóa</span>
            </Button>
        </div>
    )
}

export default AccountActions;