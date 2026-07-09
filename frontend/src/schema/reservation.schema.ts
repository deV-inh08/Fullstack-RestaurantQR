import z from 'zod'

// ─── Enums (must match C# enum string values) ────────────────────────────────
export const ReservationStatusValues = ['Booked', 'CheckedIn', 'Cancelled'] as const
export const DepositStatusValues = ['None', 'Pending', 'Paid', 'Refunded', 'Forfeited'] as const

export type ReservationStatusType = (typeof ReservationStatusValues)[number]
export type DepositStatusType = (typeof DepositStatusValues)[number]

// ─── DTO ─────────────────────────────────────────────────────────────────────
export const ReservationDtoSchema = z.object({
    id: z.string(),
    guestName: z.string(),
    guestPhone: z.string(),
    guestEmail: z.string().nullable(),
    tableId: z.number().nullable(),
    tableNumber: z.number().nullable(),
    numberOfPeople: z.number(),
    status: z.enum(ReservationStatusValues),
    reservationDate: z.coerce.date(),
    depositAmount: z.number(),
    depositStatus: z.enum(DepositStatusValues),
    note: z.string().nullable(),
    accountId: z.number().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})
export type ReservationDto = z.TypeOf<typeof ReservationDtoSchema>

// ─── Paginated list ───────────────────────────────────────────────────────────
export const ReservationListResSchema = z.object({
    message: z.string(),
    data: z.object({
        data: z.array(ReservationDtoSchema),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
        totalPages: z.number(),
    })
})
export type ReservationListResType = z.TypeOf<typeof ReservationListResSchema>

export const ReservationResSchema = z.object({
    message: z.string(),
    data: ReservationDtoSchema,
})
export type ReservationResType = z.TypeOf<typeof ReservationResSchema>

// ─── Create ───────────────────────────────────────────────────────────────────
export const CreateReservationBodySchema = z.object({
    guestName: z.string().trim().min(1, 'Họ tên không được để trống'),
    guestPhone: z.string().trim().min(8, 'Số điện thoại không hợp lệ'),
    guestEmail: z.string().email().optional().nullable(),
    tableId: z.number().int().positive().optional().nullable(),
    tableNumber: z.number().int().positive().optional().nullable(),
    numberOfPeople: z.number().int().positive('Số khách phải ≥ 1'),
    reservationDate: z.coerce.date(),
    depositAmount: z.number().min(0).default(0),
    depositStatus: z.enum(DepositStatusValues).default('None'),
    note: z.string().max(500).optional().nullable(),
})
export type CreateReservationBodyType = z.TypeOf<typeof CreateReservationBodySchema>

// ─── Update ───────────────────────────────────────────────────────────────────
export const UpdateReservationBodySchema = z.object({
    guestName: z.string().trim().min(1),
    guestPhone: z.string().trim().min(8),
    guestEmail: z.string().email().optional().nullable(),
    tableId: z.number().int().positive().optional().nullable(),
    tableNumber: z.number().int().positive().optional().nullable(),
    numberOfPeople: z.number().int().positive(),
    reservationDate: z.coerce.date(),
    depositAmount: z.number().min(0),
    note: z.string().max(500).optional().nullable(),
})
export type UpdateReservationBodyType = z.TypeOf<typeof UpdateReservationBodySchema>

// ─── Status update ────────────────────────────────────────────────────────────
export const UpdateReservationStatusBodySchema = z.object({
    status: z.enum(ReservationStatusValues),
    accountId: z.number().nullable().optional(),
})
export type UpdateReservationStatusBodyType = z.TypeOf<typeof UpdateReservationStatusBodySchema>

// ─── Deposit update ───────────────────────────────────────────────────────────
export const UpdateDepositStatusBodySchema = z.object({
    depositStatus: z.enum(DepositStatusValues),
})
export type UpdateDepositStatusBodyType = z.TypeOf<typeof UpdateDepositStatusBodySchema>

// ─── Query params ─────────────────────────────────────────────────────────────
export interface ReservationQueryParams {
    page?: number
    pageSize?: number
    status?: ReservationStatusType
    fromDate?: string          // ISO date string
    toDate?: string
    guestPhone?: string
}

// ─── Response schema for table/reservation-available ────────────────────────
export const ReservationTableDtoSchema = z.object({
    id: z.number(),
    number: z.number().nullable(),
    capacity: z.number(),
    status: z.enum(['Available', 'Occupied', 'Maintenance', 'Reserved']),
})
export type ReservationTableDto = z.TypeOf<typeof ReservationTableDtoSchema>   