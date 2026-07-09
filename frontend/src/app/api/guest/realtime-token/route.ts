import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Tương đương /api/realtime-token nhưng dành cho Guest.
 * Đọc guestAccessToken từ httpOnly cookie và trả về cho SignalR client
 * (WebSocket cần token ngay tại browser — ngoại lệ BFF bắt buộc).
 *
 * useOrderSignalR sẽ gọi endpoint này khi role = 'guest':
 *   const tokenEndpoint = '/api/guest/realtime-token'
 */
export async function GET() {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('guestAccessToken')?.value

    if (!accessToken) {
        return NextResponse.json(
            { message: 'Guest not authenticated' },
            { status: 401 }
        )
    }

    return NextResponse.json({ accessToken })
}