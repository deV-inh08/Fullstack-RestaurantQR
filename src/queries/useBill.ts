import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import billApiRequest from '../apiRequests/bill.request'
import type { ConfirmBillBodyType } from '../schema/bill.schema'

export const billKeys = {
    all: ['bills'] as const,
    byTable: (tableId: number) => ['bills', 'table', tableId] as const,
}

export const useGetBills = (page = 1, pageSize = 20) =>
    useQuery({
        queryKey: [...billKeys.all, page, pageSize],
        queryFn: () => billApiRequest.getAll(page, pageSize),
    })

export const useGetBillByTable = (tableId: number) =>
    useQuery({
        queryKey: billKeys.byTable(tableId),
        queryFn: () => billApiRequest.getByTable(tableId),
        enabled: tableId > 0,
    })

// Không còn nhận guestAccessToken làm tham số — cookie tự động được BFF gắn.
export const useRequestBillMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: () => billApiRequest.request(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: billKeys.all }),
    })
}

export const useConfirmBillMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, body }: { id: number; body: ConfirmBillBodyType }) =>
            billApiRequest.confirm(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: billKeys.all }),
    })
}
