import { z } from 'zod'

/**
 * SERVER-ONLY CONFIG.
 * KHÔNG bao giờ import file này từ component 'use client' hoặc từ bất kỳ
 * module nào lọt vào bundle của browser — nó chứa URL thật của các
 * microservice mà trình duyệt không được phép biết. Chỉ import từ
 * src/app/api/** hoặc src/lib/server-fetch.ts.
 */
const serverConfigSchema = z.object({
    IDENTITY_API_URL: z.string(),
    MENU_API_URL: z.string(),
    ORDER_API_URL: z.string(),
    RESERVATION_API_URL: z.string(),
})

const parsed = serverConfigSchema.safeParse({
    IDENTITY_API_URL: process.env.IDENTITY_API_URL,
    MENU_API_URL: process.env.MENU_API_URL,
    ORDER_API_URL: process.env.ORDER_API_URL,
    RESERVATION_API_URL: process.env.RESERVATION_API_URL,
})


if (!parsed.success) {
    console.error(parsed.error)
    throw new Error(
        'Thiếu biến môi trường server-only (IDENTITY_API_URL / MENU_API_URL / ' +
        'ORDER_API_URL / RESERVATION_API_URL). Đây là các URL nội bộ gọi trực ' +
        'tiếp tới microservice, KHÔNG có tiền tố NEXT_PUBLIC_ vì trình duyệt ' +
        'không được phép biết.'
    )
}

const serverConfig = parsed.data
export default serverConfig
