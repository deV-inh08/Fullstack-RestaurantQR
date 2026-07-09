import z from 'zod'

export const GuestLoginBodySchema = z.object({
    tableNumber: z.number(),
    name: z.string().min(1).max(50),
})
export type GuestLoginBodyType = z.TypeOf<typeof GuestLoginBodySchema>

// Khớp GuestDto(int Id, string Name, int TableId, int TableNumber, DateTime CreatedAt) ở BE
export const GuestDtoSchema = z.object({
    id: z.number(),
    name: z.string(),
    tableId: z.number(),
    tableNumber: z.number(),
})
export type GuestDtoType = z.TypeOf<typeof GuestDtoSchema>

// ── Response THẬT từ Order.API (guest/login, guest/refresh-token) — chỉ
// dùng trong route handler /api/guest-auth/*, KHÔNG lộ ra client. ──
export const GuestLoginResponse = z.object({
    data: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        guest: GuestDtoSchema,
    }),
    message: z.string(),
})
export type GuestLoginResponseType = z.TypeOf<typeof GuestLoginResponse>

// ── Response client THỰC SỰ nhận được từ /api/guest-auth/* — không có token. ──
export const GuestLoginClientResponse = z.object({
    data: z.object({ guest: GuestDtoSchema }),
    message: z.string(),
})
export type GuestLoginClientResponseType = z.TypeOf<typeof GuestLoginClientResponse>

// Khớp OrderDto đầy đủ ở BE — thêm dishImage/tableNumber/updatedAt so với bản trước
export const GuestOrderListResponse = z.object({
    data: z.array(
        z.object({
            id: z.number(),
            tableNumber: z.number(),
            dishSnapshotId: z.number(),
            dishName: z.string(),
            dishPrice: z.number(),
            dishImage: z.string().nullable(),
            quantity: z.number(),
            status: z.enum(['Pending', 'Preparing', 'Served', 'Cancelled']),
            createdAt: z.string(),
            updatedAt: z.string(),
        })
    ),
    message: z.string(),
})
export type GuestOrderListResponseType = z.TypeOf<typeof GuestOrderListResponse>