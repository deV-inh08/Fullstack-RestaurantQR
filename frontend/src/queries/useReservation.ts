import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import reservationApiRequest from '../apiRequests/reservation.request'
import type {
    CreateReservationBodyType,
    ReservationQueryParams,
    UpdateDepositStatusBodyType,
    UpdateReservationBodyType,
    UpdateReservationStatusBodyType,
} from '../schema/reservation.schema'

export const reservationKeys = {
    all: ['reservations'] as const,
    list: (params: ReservationQueryParams) => ['reservations', 'list', params] as const,
    detail: (id: string) => ['reservations', id] as const,
}

// ─── Queries ───────────────────────────────────────────────────────────────────
export const useGetReservations = (params: ReservationQueryParams = {}) =>
    useQuery({
        queryKey: reservationKeys.list(params),
        queryFn: () => reservationApiRequest.getAll(params),
        placeholderData: keepPreviousData,
    })

export const useGetReservation = (id: string, enabled = true) =>
    useQuery({
        queryKey: reservationKeys.detail(id),
        queryFn: () => reservationApiRequest.getById(id),
        enabled: Boolean(id) && enabled,
    })

// ─── Mutations ─────────────────────────────────────────────────────────────────
export const useCreateReservationMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (body: CreateReservationBodyType) => reservationApiRequest.create(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: reservationKeys.all }),
    })
}

export const useUpdateReservationMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateReservationBodyType & { id: string }) =>
            reservationApiRequest.update(id, body),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: reservationKeys.all })
            qc.invalidateQueries({ queryKey: reservationKeys.detail(vars.id) })
        },
    })
}

export const useUpdateReservationStatusMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateReservationStatusBodyType & { id: string }) =>
            reservationApiRequest.updateStatus(id, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: reservationKeys.all }),
    })
}

export const useUpdateDepositStatusMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateDepositStatusBodyType & { id: string }) =>
            reservationApiRequest.updateDeposit(id, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: reservationKeys.all }),
    })
}

export const useDeleteReservationMutation = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => reservationApiRequest.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: reservationKeys.all }),
    })
}