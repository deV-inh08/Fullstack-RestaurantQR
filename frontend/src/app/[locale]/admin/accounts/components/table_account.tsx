import { createContext, useContext, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table"
import { cn } from "@/src/lib/utils"
import { AccountListResType } from "@/src/schema/account.schema"
import InitialsAvatar from "./initial_avatar"
import AccountActions from './account_action'
import DeleteAccountDialog from './delete_dialog_account'
import EditEmployee from './edit_employee'

// ─── Role Pill ──────────────────────────────────────
const ROLE_STYLES: Record<string, string> = {
    SuperAdmin: 'bg-primary/20 text-primary',
    Admin: 'bg-primary/20 text-primary',
    Staff: 'bg-white/8 text-foreground'
}
function RolePill({ role }: { role: string }) {
    return (
        <span
            className={cn(
                'inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
                ROLE_STYLES[role] ?? ROLE_STYLES.Staff
            )}
        >
            {role}
        </span>
    )
}

export type AccountItem = AccountListResType["data"][0]

interface TableAccountProps {
    accounts: AccountItem[] | []
}


// ─── Format date ────────────────────────────────────
function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// ─── Context ────────────────────────────────────────
interface AccountTableContextValue {
    accountIdEdit: number | undefined
    setAccountIdEdit: (id: number | undefined) => void
    accountToDelete: AccountItem | null
    setAccountToDelete: (item: AccountItem | null) => void
}

export const AccountTableContext = createContext<AccountTableContextValue>({
    accountIdEdit: undefined,
    setAccountIdEdit: () => { },
    accountToDelete: null,
    setAccountToDelete: () => { }
})

const TableAccount = ({ accounts }: TableAccountProps) => {
    const t = useTranslations('Admin.Accounts')
    const [accountIdEdit, setAccountIdEdit] = useState<number | undefined>(undefined)
    const [accountToDelete, setAccountToDelete] = useState<AccountItem | null>(null)
    return (
        <AccountTableContext.Provider value={{ accountIdEdit, setAccountIdEdit, accountToDelete, setAccountToDelete }}>

            <EditEmployee id={accountIdEdit} setId={setAccountIdEdit} />
            <DeleteAccountDialog
                account={accountToDelete}
                onClose={() => setAccountToDelete(null)}
            />
            <Table>
                <TableHeader>
                    <TableRow className="border-border-subtle hover:bg-transparent">
                        <TableHead className="w-16 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Avatar
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Name
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Email
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Role
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Joined
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Actions
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accounts.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                {t("empty")}
                            </TableCell>
                        </TableRow>
                    )}
                    {accounts.map((account) => (
                        <TableRow
                            key={account.id}
                            className="border-border-subtle transition-colors hover:bg-gold-subtle/30"
                        >
                            <TableCell>
                                <InitialsAvatar name={account.name} />
                            </TableCell>
                            <TableCell className="font-medium text-foreground">{account.name}</TableCell>
                            <TableCell className="text-muted-foreground">{account.email}</TableCell>
                            <TableCell>
                                <RolePill role={account.role} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {formatDate(account.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                                <AccountActions account={account} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </AccountTableContext.Provider>
    );
};

export default TableAccount;