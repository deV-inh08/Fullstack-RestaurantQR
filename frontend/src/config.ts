import { z } from 'zod'

// Config public — bị bundle vào browser. KHÔNG được chứa URL backend;
// các URL đó nằm trong config.server.ts và chỉ đọc trong route handler.
const configSchema = z.object({
    NEXT_PUBLIC_URL: z.string(),
    NEXT_PUBLIC_SIGNALR_ORDER: z.string(),
    // Ảnh món ăn là static asset public do Menu.API serve không cần auth —
    // đây là ngoại lệ DUY NHẤT được phép cho browser biết origin backend trực tiếp.
    NEXT_PUBLIC_MENU_ASSETS_URL: z.string(),
})

const configProject = configSchema.safeParse({
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_SIGNALR_ORDER: process.env.NEXT_PUBLIC_SIGNALR_ORDER,
    NEXT_PUBLIC_MENU_ASSETS_URL: process.env.NEXT_PUBLIC_MENU_ASSETS_URL,
})

if (!configProject.success) {
    console.log(configProject.error)
    throw new Error('Các biến môi trường không hợp lệ')
}
const envConfig = configProject.data

export type Locale = (typeof locales)[number]

export const locales = ['en', 'vi'] as const
export const defaultLocale: Locale = 'en'

export default envConfig
export const PAGE_SIZE = 10
