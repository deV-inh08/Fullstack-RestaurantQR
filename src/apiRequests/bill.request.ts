import http from '../lib/http'
import type { BillResType, BillListResType, ConfirmBillBodyType } from '../schema/bill.schema'

const billApiRequest = {
    getAll: (page = 1, pageSize = 20) =>
        http.get<BillListResType>(`/bill?page=${page}&pageSize=${pageSize}`, { service: 'order' }),

    getByTable: (tableId: number) =>
        http.get<BillResType>(`/bill/table/${tableId}`, { service: 'order' }),

    // Guest yêu cầu thanh toán — guestAccessToken cookie được BFF tự gắn,
    // không còn truyền guestAccessToken làm tham số nữa.
    request: () => http.post<BillResType>('/bill/request', {}, { service: 'guest' }),

    confirm: (id: number, body: ConfirmBillBodyType) =>
        http.patch<BillResType>(`/bill/${id}/pay`, body, { service: 'order' }),
}

export default billApiRequest
