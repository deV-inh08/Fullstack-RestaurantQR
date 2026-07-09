import { useMutation, useQuery } from '@tanstack/react-query'
import guestApiRequest from '../apiRequests/guest.request'
import { GuestLoginBodyType } from '../schema/guest.schema'

export const guestKeys = {
    myOrders: (tableId: string) => ['guest-orders', tableId] as const,
    tablePublic: (tableId: number) => ['table-public', tableId] as const,
}

export const useGuestLoginMutation = () =>
    useMutation({
        mutationFn: (body: GuestLoginBodyType) => guestApiRequest.login(body),
    })

export const useGuestRefreshTokenMutation = () =>
    useMutation({
        mutationFn: () => guestApiRequest.refreshToken(),
    })

// Không còn nhận guestAccessToken làm tham số — cookie tự động được BFF gắn.
export const useGetMyOrders = (tableId: string) =>
    useQuery({
        queryKey: guestKeys.myOrders(tableId),
        queryFn: () => guestApiRequest.getMyOrders(),
    })

export const useGetTablePublic = (tableId: number) =>
    useQuery({
        queryKey: guestKeys.tablePublic(tableId),
        queryFn: () => guestApiRequest.getTablePublic(tableId),
        enabled: tableId > 0,
        staleTime: 5 * 60 * 1000,
    })
