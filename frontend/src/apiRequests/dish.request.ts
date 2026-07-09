import http from '../lib/http'
import {
    CreateDishBodyType,
    DishListResType,
    DishResType,
    UpdateDishBodyType,
} from '../schema/dish.schema'
import { DishStatus } from '../constants/dish-status'

const dishApiRequest = {
    // ─── GET all dishes ───────────────────────────────────────────────────────
    list: () =>
        http.get<{ data: DishListResType }>('/menu/dishes', {
            next: { tags: ['dishes'] },
            service: 'menu',
        }),

    // ─── GET single dish ──────────────────────────────────────────────────────
    getDish: (id: number) =>
        http.get<DishResType>(`/menu/dishes/${id}`, { service: 'menu' }),

    // ─── CREATE dish (multipart/form-data) ───────────────────────────────────
    // Backend CreateDishRequest dùng [FromForm] với các field:
    //   name (required), price (required), description (required),
    //   category (required), image (optional IFormFile)
    // Backend KHÔNG có field 'status' trong CreateDishRequest —
    //   MenuService hardcode Status = DishStatus.Available khi create.
    add: (body: CreateDishBodyType) => {
        const formData = new FormData()

        formData.append('name', body.name.trim())
        formData.append('price', String(body.price))
        formData.append('description', body.description ?? '')
        formData.append('category', body.category) // "MainCourse" | "Dessert" | "Beverage"

        // Chỉ append image khi là File thực sự.
        // Nếu là string URL (edit case), không gửi — backend giữ nguyên imagePath cũ.
        if (body.image instanceof File) {
            formData.append('image', body.image, body.image.name)
        }

        // KHÔNG set Content-Type header ở đây.
        // http.ts đã handle: khi body là FormData thì để browser tự set
        // "multipart/form-data; boundary=xxx" — thiếu boundary thì server trả 415.
        return http.post<DishResType>('/menu/dishes', formData, { service: 'menu' })
    },

    // ─── UPDATE dish ──────────────────────────────────────────────────────────
    // UPDATE — now also multipart/form-data (backend changed to [FromForm])
    // If body.image is a File → upload new image
    // If body.image is null/undefined → backend keeps existing image
    updateDish: (id: number, body: UpdateDishBodyType) => {
        const formData = new FormData()
        formData.append('name', body.name.trim())
        formData.append('price', String(body.price))
        formData.append('description', body.description ?? '')
        formData.append('category', body.category)
        if (body.image instanceof File) {
            formData.append('image', body.image, body.image.name)
        }
        return http.put<DishResType>(`/menu/dishes/${id}`, formData, { service: 'menu' })
    },

    // ─── UPDATE status only (PATCH) ───────────────────────────────────────────
    updateStatusDish: (
        id: number,
        body: { status: (typeof DishStatus)[keyof typeof DishStatus] }
    ) =>
        http.patch<DishResType>(`/menu/dishes/${id}/status`, body, { service: 'menu' }),

    // ─── DELETE dish ──────────────────────────────────────────────────────────
    deleteDish: (id: number) =>
        http.delete<DishResType>(`/menu/dishes/${id}`, { service: 'menu' }),
}

export default dishApiRequest