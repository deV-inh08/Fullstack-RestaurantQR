import z from "zod";

export interface OrderDto {
    id: number
    guestId: number
    guestName: string
    tableId: number
    tableNumber: number
    dishSnapshotId: number
    dishName?: string
    dishPrice: number
    dishImage?: string | null   // ← was missing
    accountId: number | null
    quantity: number
    status: string
    createdAt: string
    updatedAt: string
}

const orderSchema = z.object({
    id: z.number(),
    guestId: z.number(),
    guestName: z.string(),
    tableId: z.number(),
    tableNumber: z.number(),
    dishSnapshotId: z.number(),
    dishName: z.string().optional(),
    dishPrice: z.number(),
    dishImage: z.string().nullable().optional(),   // ← was missing
    accountId: z.number().nullable(),
    quantity: z.number(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
})

export const OrderListRes = z.object({
    data: z.array(orderSchema),
    message: z.string(),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
})
export type OrderListResType = z.TypeOf<typeof OrderListRes>

export const OrderRes = z.object({
    data: orderSchema,
    message: z.string()
})
export type OrderResType = z.TypeOf<typeof OrderRes>

export const UpdateOrderStatusBody = z.object({
    status: z.enum(['Pending', 'Preparing', 'Served', 'Cancelled']),
    accountId: z.number().nullable().optional()
})
export type UpdateOrderStatusBodyType = z.TypeOf<typeof UpdateOrderStatusBody>

export const OrderStatus = {
    Pending: 'Pending',
    Preparing: 'Preparing',
    Served: 'Served',
    Cancelled: 'Cancelled'
}

export interface CreateOrderRequest {
    tableId: number
    dishSnapshotId: number
    quantity: number
}

export const CreateOrderBodySchema = z.object({
    tableId: z.number().int().positive('Table ID must be positive'),
    dishSnapshotId: z.number().int().positive('Dish snapshot ID must be positive'),
    quantity: z.number().int().positive('Quantity must be at least 1')
})
export type CreateOrderBodyType = z.TypeOf<typeof CreateOrderBodySchema>