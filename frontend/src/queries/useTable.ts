import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import tableApiRequest from '../apiRequests/table.request'
import { CreateTableBodyType, UpdateTableStatusBodyType } from '@/src/schema/table.schema'

export const tableKeys = {
    all: (page: number, pageSize: number) => ['tables', page, pageSize] as const,
    allTables: ['tables'] as const,
    detail: (id: number) => ['tables', id] as const
}

export const useGetTables = ({ page, pageSize }: { page: number, pageSize: number }) =>
    useQuery({
        queryKey: tableKeys.all(page, pageSize),
        queryFn: () => tableApiRequest.getAll(page, pageSize),
        placeholderData: keepPreviousData
    })

export const useGetTable = ({ id, enabled }: { id: number; enabled: boolean }) =>
    useQuery({
        queryKey: tableKeys.detail(id),
        queryFn: () => tableApiRequest.getById(id),
        enabled
    })

export const useCreateTableMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (body: CreateTableBodyType) => tableApiRequest.create(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.allTables })
    })
}

export const useUpdateTableStatusMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateTableStatusBodyType & { id: number }) =>
            tableApiRequest.updateStatus(id, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.allTables })
    })
}

// update table visibility
export const useUpdateTableVisibilityMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ tableNumber, isVisibleOnReservation }: { tableNumber: number; isVisibleOnReservation: boolean }) =>
            tableApiRequest.updateVisibility(tableNumber, isVisibleOnReservation),
        onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.allTables })
    })
}

export const useResetTableMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => tableApiRequest.reset(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.allTables })
    })
}

export const useDeleteTableMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => tableApiRequest.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.allTables })
    })
}

export const useGetTablesForReservation = () =>
    useQuery({
        queryKey: ['tables-reservation'],
        queryFn: tableApiRequest.getAvailableForReservation,
        staleTime: 60_000,   // 1 phút — không cần refresh quá thường
    })