import http from '../lib/http'

import { OrderListResType, OrderResType, CreateOrderBodyType, UpdateOrderStatusBodyType } from '../schema/order.schema';
const orderApiRequest = {
    /** Admin/Staff: get all orders */
    getAll: (page: number, pageSize: number) =>
        http.get<{ data: OrderListResType }>(`/order?page=${page}&pageSize=${pageSize}`, { service: 'order', }),

    /** Admin/Staff: update order status */
    updateStatus: (id: number, body: UpdateOrderStatusBodyType) =>
        http.patch<OrderResType>(`/order/${id}/status`, body, { service: 'order' }),


    create: (body: CreateOrderBodyType) =>
        http.post<OrderResType>('/order', body, { service: 'guest' })
}

export default orderApiRequest