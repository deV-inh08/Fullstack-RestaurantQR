import z from 'zod'

export interface TableDto {
    id: number
    number: number
    capacity: number
    status: string
    isVisibleOnReservation: boolean
    createdAt: string
    updatedAt: string
}

export const tableSchema = z.object({
    id: z.number(),
    number: z.number(),
    capacity: z.number(),
    status: z.enum(['Available', 'Occupied', 'Hidden']),
    isVisibleOnReservation: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
})
export const tableListSchema = z.object({
    data: z.array(tableSchema),
    message: z.string(),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
})
export const tableResSchema = z.object({
    data: tableSchema,
    message: z.string()
})


export const createTableBodySchema = z.object({
    number: z.number(),
    capacity: z.number(),
    isVisibleOnReservation: z.boolean()
})
export const updateTableStatusBodySchema = z.object({
    status: z.enum(['Available', 'Occupied', 'Hidden'])
})
export type TableListResType = z.TypeOf<typeof tableListSchema>
export type TableResType = z.TypeOf<typeof tableResSchema>
export type CreateTableBodyType = z.TypeOf<typeof createTableBodySchema>
export type UpdateTableStatusBodyType = z.TypeOf<typeof updateTableStatusBodySchema>