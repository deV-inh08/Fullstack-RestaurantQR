import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import serverConfig from '@/src/config.server'
import { decodedToken } from '@/src/types/token.type'

export type ServiceName = 'identity' | 'menu' | 'order' | 'reservation' | 'guest'
type AuthMode = 'staff' | 'guest' | 'none'

interface ServiceEntry {
    baseUrl: string
    auth: AuthMode
}

// Segment đầu tiên sau /api/ -> gọi backend nào + đọc cookie nào.
// 'guest' forward tới CÙNG backend với 'order' nhưng đọc cookie guest
// thay vì cookie staff — đây là chỗ tách auth context, không phải tách service.
const SERVICE_MAP: Record<ServiceName, ServiceEntry> = {
    identity: { baseUrl: serverConfig.IDENTITY_API_URL, auth: 'staff' },
    menu: { baseUrl: serverConfig.MENU_API_URL, auth: 'staff' },
    order: { baseUrl: serverConfig.ORDER_API_URL, auth: 'staff' },
    reservation: { baseUrl: serverConfig.RESERVATION_API_URL, auth: 'staff' },
    guest: { baseUrl: serverConfig.ORDER_API_URL, auth: 'guest' },
}

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
    'host', 'cookie', 'content-length', 'connection', 'accept-encoding',
])

function setAuthCookies(
    res: NextResponse,
    accessCookieName: 'accessToken' | 'guestAccessToken',
    refreshCookieName: 'refreshToken' | 'guestRefreshToken',
    accessToken: string,
    refreshToken: string,
) {
    const decodedAccess = jwt.decode(accessToken) as decodedToken
    const decodedRefresh = jwt.decode(refreshToken) as decodedToken
    res.cookies.set(accessCookieName, accessToken, {
        httpOnly: true, sameSite: 'lax', path: '/', secure: true,
        expires: new Date(decodedAccess.exp * 1000),
    })
    res.cookies.set(refreshCookieName, refreshToken, {
        httpOnly: true, sameSite: 'lax', path: '/', secure: true,
        expires: new Date(decodedRefresh.exp * 1000),
    })
}

async function refreshStaffToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value
    if (!refreshToken) return null
    try {
        const res = await fetch(`${serverConfig.IDENTITY_API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return null
        const json = await res.json()
        return json?.data ?? null
    } catch {
        return null
    }
}

async function refreshGuestToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('guestRefreshToken')?.value
    if (!refreshToken) return null
    try {
        const res = await fetch(`${serverConfig.ORDER_API_URL}/guest/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return null
        const json = await res.json()
        return json?.data ?? null
    } catch {
        return null
    }
}

async function toNextResponse(upstream: Response): Promise<NextResponse> {
    const contentType = upstream.headers.get('content-type') ?? 'application/json'
    return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: { 'content-type': contentType },
    })
}

/**
 * Forward `request` tới microservice xác định bởi `pathSegments[0]`, tự gắn
 * Bearer token đúng từ httpOnly cookie tương ứng, và tự retry 1 lần sau khi
 * silent-refresh nếu gặp 401 — client KHÔNG bao giờ thấy hoặc xử lý token.
 *
 * `pathSegments` là toàn bộ catch-all param, ví dụ ['menu', 'dishes', '12'].
 *
 * Lưu ý: body được buffer 1 lần vào ArrayBuffer (không stream trực tiếp)
 * để có thể gửi lại lần 2 khi cần retry sau refresh — ReadableStream chỉ đọc
 * được 1 lần nên không thể tái sử dụng cho 2 lần fetch. Với app này (ảnh tối
 * đa 5MB) đánh đổi này là hợp lý.
 */
export async function proxyRequest(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
    const [service, ...rest] = pathSegments
    const entry = SERVICE_MAP[service as ServiceName]

    if (!entry) {
        return NextResponse.json({ message: `Unknown BFF service prefix: ${service}` }, { status: 404 })
    }

    const cookieStore = await cookies()
    const tokenCookieName = entry.auth === 'guest' ? 'guestAccessToken' : 'accessToken'
    const token = entry.auth === 'none' ? null : cookieStore.get(tokenCookieName)?.value ?? null

    const search = request.nextUrl.search ?? ''
    const targetUrl = `${entry.baseUrl}/${rest.join('/')}${search}`

    const hasBody = !['GET', 'HEAD'].includes(request.method)
    const bodyBuffer = hasBody ? await request.arrayBuffer() : undefined

    const doFetch = (bearer: string | null) => {
        const headers = new Headers()
        request.headers.forEach((value, key) => {
            if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value)
        })
        if (bearer) headers.set('Authorization', `Bearer ${bearer}`)
        else headers.delete('Authorization')

        return fetch(targetUrl, {
            method: request.method,
            headers,
            body: hasBody ? bodyBuffer : undefined,
        })
    }

    let upstream = await doFetch(token)

    // Silent refresh-and-retry đúng 1 lần — chỉ khi ban đầu có gắn token
    // (endpoint AllowAnonymous không có token thì 401 ở đây là lỗi thật,
    // không liên quan gì tới hết hạn token).
    if (upstream.status === 401 && entry.auth !== 'none' && token) {
        const refreshed = entry.auth === 'guest' ? await refreshGuestToken() : await refreshStaffToken()

        if (refreshed) {
            upstream = await doFetch(refreshed.accessToken)
            const finalRes = await toNextResponse(upstream)
            if (entry.auth === 'guest') {
                setAuthCookies(finalRes, 'guestAccessToken', 'guestRefreshToken', refreshed.accessToken, refreshed.refreshToken)
            } else {
                setAuthCookies(finalRes, 'accessToken', 'refreshToken', refreshed.accessToken, refreshed.refreshToken)
            }
            return finalRes
        }

        // Refresh thất bại -> session đã chết thật, xoá cookie để client
        // không cố gọi lại vô tận.
        const deadRes = await toNextResponse(upstream)
        if (entry.auth === 'guest') {
            deadRes.cookies.delete('guestAccessToken')
            deadRes.cookies.delete('guestRefreshToken')
        } else {
            deadRes.cookies.delete('accessToken')
            deadRes.cookies.delete('refreshToken')
        }
        return deadRes
    }

    return toNextResponse(upstream)
}
