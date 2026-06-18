import http from '../lib/http'
import {
    GuestLoginBodyType,
    GuestOrderListResponseType,
    GuestLoginClientResponseType
} from '../schema/guest.schema'

/**
 * Toàn bộ guest API giờ đi qua BFF:
 * - login/refreshToken: route handler riêng (/api/guest-auth/*) vì cần set
 *   httpOnly cookie — không thể đi qua catch-all proxy forward thuần.
 * - các API còn lại: service: 'guest' → catch-all proxy
 *   (src/app/api/[...path]/route.ts) tự gắn guestAccessToken cookie thành
 *   Authorization header — KHÔNG cần truyền token thủ công nữa.
 */
const guestApiRequest = {
    login: (body: GuestLoginBodyType) =>
        http.post<GuestLoginClientResponseType>('/api/guest-auth/login', body, { baseUrl: '' }),

    refreshToken: () =>
        http.post<GuestLoginClientResponseType>('/api/guest-auth/refresh-token', null, { baseUrl: '' }),

    getMyOrders: () =>
        http.get<GuestOrderListResponseType>('/order/my-orders', { service: 'order' }),

    getTablePublic: (tableId: number) =>
        http.get<{ message: string; data: { id: number; number: number; status: string } }>(
            `/table/${tableId}/public`,
            { service: 'order' }
        ),
}

export default guestApiRequest
