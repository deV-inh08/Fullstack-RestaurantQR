import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import orderApiRequest from '@/src/apiRequests/order.request'
import { CreateOrderBodyType, UpdateOrderStatusBodyType } from '@/src/schema/order.schema'
// ─── Order keys ────────────────────────────────────
export const orderKeys = {
    all: (page: number, pageSize: number) => ['orders', page, pageSize] as const,
    allOrders: ['orders'] as const,
}

export const useGetOrders = ({ page, pageSize }: { page: number, pageSize: number }) =>
    useQuery({
        queryKey: orderKeys.all(page, pageSize),
        queryFn: () => orderApiRequest.getAll(page, pageSize),
        placeholderData: keepPreviousData
    })

export const useUpdateOrderStatusMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateOrderStatusBodyType & { id: number }) =>
            orderApiRequest.updateStatus(id, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.allOrders })
    })
}

export const useCreateOrderMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (body: CreateOrderBodyType) => orderApiRequest.create(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.allOrders })
    })
}