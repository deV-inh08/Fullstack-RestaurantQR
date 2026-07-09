import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * SignalR cần token mà browser cầm để đưa vào accessTokenFactory — đó là
 * ngoại lệ DUY NHẤT của "không token nào chạm browser". Không lưu lại gì cả:
 * client fetch route này ngay trước khi connect/reconnect và chỉ giữ giá trị
 * trong bộ nhớ tạm trong lúc socket còn sống.
 */
export async function GET() {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value
    if (!accessToken) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }
    return NextResponse.json({ accessToken })
}
