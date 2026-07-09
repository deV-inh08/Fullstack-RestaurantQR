import z from 'zod'

export const BillStatusValues = ['Unpaid', 'Requested', 'Paid'] as const
export type BillStatus = (typeof BillStatusValues)[number]

export const BillOrderItemSchema = z.object({
    dishSnapshotId: z.number(),
    dishName: z.string(),
    dishImage: z.string().nullable().optional(),
    quantity: z.number(),
    unitPrice: z.number(),
    subtotal: z.number(),
    status: z.string(), // Pending, Preparing, Served, Cancelled
})
export type BillOrderItem = z.TypeOf<typeof BillOrderItemSchema>

export const BillDtoSchema = z.object({
    id: z.number(),
    tableId: z.number(),
    tableNumber: z.number(),
    guestName: z.string(),
    sessionId: z.string(),
    orders: z.array(BillOrderItemSchema),
    totalAmount: z.number(),
    status: z.enum(BillStatusValues),
    accountId: z.number().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
})
export type BillDto = z.TypeOf<typeof BillDtoSchema>

export const BillResSchema = z.object({
    message: z.string(),
    data: BillDtoSchema,
})
export type BillResType = z.TypeOf<typeof BillResSchema>

export const BillListResSchema = z.object({
    message: z.string(),
    data: z.object({
        data: z.array(BillDtoSchema),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
        totalPages: z.number(),
    }),
})
export type BillListResType = z.TypeOf<typeof BillListResSchema>

export const RequestBillBodySchema = z.object({
    tableId: z.number().int().positive(),
})
export type RequestBillBodyType = z.TypeOf<typeof RequestBillBodySchema>

export const ConfirmBillBodySchema = z.object({
    accountId: z.number().int().positive(),
})
export type ConfirmBillBodyType = z.TypeOf<typeof ConfirmBillBodySchema>