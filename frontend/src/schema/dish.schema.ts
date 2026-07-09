import z from 'zod'
import { CategoryStatusValues, DishStatusValues } from '../constants/dish-status'

// ─── Create ───────────────────────────────────────────────────────────────────
// Gửi multipart/form-data → image có thể là File (upload mới) hoặc undefined
export const CreateDishBody = z.object({
    name: z.string().min(1, 'Tên món không được để trống').max(256),
    price: z.union([z.string(), z.number()]).refine(
        (val) => Number(val) > 0,
        { message: 'Giá phải lớn hơn 0' }
    ),
    description: z.string().max(1000).optional().default(''),
    image: z.union([
        z.instanceof(File),
        z.string().url(),
        z.null(),
        z.undefined(),
    ]).optional(),
    category: z.enum(CategoryStatusValues),
    // status không có trong CreateDishRequest backend — backend hardcode Available
    // Để ở đây cho FE nhưng KHÔNG gửi lên backend
    status: z.enum(DishStatusValues).optional(),
})

export type CreateDishBodyType = z.TypeOf<typeof CreateDishBody>

// ─── Update ───────────────────────────────────────────────────────────────────
export const UpdateDishBody = z.object({
    name: z.string().min(1).max(256),
    price: z.number().int().positive('Giá phải lớn hơn 0'),
    description: z.string().max(1000).optional().default(''),
    // image: File = upload new image; null/undefined = keep existing
    image: z.union([
        z.instanceof(File),
        z.null(),
        z.undefined(),
    ]).optional(),
    category: z.enum(CategoryStatusValues),
})
export type UpdateDishBodyType = z.TypeOf<typeof UpdateDishBody>

// ─── Response ─────────────────────────────────────────────────────────────────
export const DishSchema = z.object({
    id: z.number(),
    name: z.string(),
    price: z.coerce.number(),
    description: z.string(),
    imagePath: z.string().nullable().optional(),  // match với backend DishDto field name
    category: z.enum(CategoryStatusValues),
    status: z.enum(DishStatusValues),
    createdAt: z.coerce.date(),
})

export type DishDto = z.TypeOf<typeof DishSchema>

export const DishRes = z.object({
    data: z.array(DishSchema),
    message: z.string(),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
})

export type DishResType = z.TypeOf<typeof DishRes>

export const DishListRes = z.object({
    data: z.array(DishSchema),
    message: z.string(),
})

export type DishListResType = z.TypeOf<typeof DishListRes>

export const DishParams = z.object({
    id: z.coerce.number(),
})

export type DishParamsType = z.TypeOf<typeof DishParams>