import { useQueryClient } from "@tanstack/react-query"
import { useOrderSignalR } from "@/src/hooks/useOrderSignalR"
import { cn } from "@/src/lib/utils"
import { useGetTables } from "@/src/queries/useTable"

export default function TableStatusGrid({
    onSelectTable,
}: {
    onSelectTable?: (tableId: number) => void
}) {
    const { data: tablesData } = useGetTables({ page: 1, pageSize: 50 })
    const tables = tablesData?.payload.data.data ?? []
    const queryClient = useQueryClient()

    // Không còn getAccessTokenFromLocalStorage() — trang admin đã qua
    // middleware nên luôn enabled, token thật lấy qua /api/realtime-token.
    useOrderSignalR({
        role: 'staff',
        enabled: true,
        onOrderCreated: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        },
        onTableStatusChanged: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        },
    })

    return (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            {tables.map((table) => (
                <button
                    key={table.id}
                    onClick={() => onSelectTable?.(table.id)}
                    className={cn(
                        "rounded-xl border p-3 text-center text-sm font-semibold",
                        table.status === 'Occupied' && "border-primary bg-primary/10 text-primary",
                        table.status === 'Available' && "border-foreground/10 text-foreground/60",
                        table.status === 'Hidden' && "border-foreground/5 text-foreground/30"
                    )}
                >
                    Bàn {table.number}
                </button>
            ))}
        </div>
    )
}
