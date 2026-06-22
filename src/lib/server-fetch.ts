import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import serverConfig from '@/src/config.server'
import { decodedToken } from '@/src/types/token.type'
import { setStaffCookiesOnResponse } from '@/src/lib/set-auth-cookies'

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

const HOP_BY_HOP = new Set([
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

function clearAuthCookies(res: NextResponse, auth: AuthMode) {
    if (auth === 'guest') {
        res.cookies.delete('guestAccessToken')
        res.cookies.delete('guestRefreshToken')
    } else {
        res.cookies.delete('accessToken')
        res.cookies.delete('refreshToken')
        res.cookies.delete('atExpiresAt') // ← thêm
    }
}

/**
 * Staff refresh — Identity.API
 * POST {IDENTITY_API_URL}/auth/refresh-token
 * Body:     { refreshToken: string }
 * Response: { message, data: { accessToken, refreshToken } }
 *
 *
 *  Lưu ý: Identity.API dùng rotation — xóa token cũ, tạo token mới mỗi lần refresh.
 */

// Module-level deduplication (shared trong cùng 1 Node.js process)
let staffRefreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null
let guestRefreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null


async function refreshStaffToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    // Nếu đang có refresh đang chạy → chờ kết quả đó thay vì tạo mới
    if (staffRefreshPromise) {
        return staffRefreshPromise
    }

    staffRefreshPromise = (async () => {
        const cookieStore = await cookies()
        const refreshToken = cookieStore.get('refreshToken')?.value
        if (!refreshToken) return null

        try {
            const res = await fetch(
                `${serverConfig.IDENTITY_API_URL}/auth/refresh-token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                }
            )

            console.log("refreshtoken__________res", res)
            if (!res.ok) return null
            const json = await res.json()
            return json?.data ?? null
        } catch {
            return null
        } finally {
            // Reset sau khi xong để lần tiếp theo có thể refresh lại
            staffRefreshPromise = null
        }
    })()

    return staffRefreshPromise
}

/**
 * Guest refresh — Order.API
 * POST {ORDER_API_URL}/guest/refresh-token
 * Body:     { refreshToken: string }
 * Response: { message, data: { guest, accessToken, refreshToken } }
 *
 * Lưu ý: Guest token không lưu DB — validate bằng JWT signature + sessionId.
 * Nếu Staff reset bàn → sessionId đổi → refresh token từ chối dù còn hạn.
 */
// Tương tự cho refreshGuestToken
async function refreshGuestToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    if (guestRefreshPromise) {
        return guestRefreshPromise
    }

    guestRefreshPromise = (async () => {
        const cookieStore = await cookies()
        const refreshToken = cookieStore.get('guestRefreshToken')?.value
        if (!refreshToken) return null

        try {
            const res = await fetch(
                `${serverConfig.ORDER_API_URL}/guest/refresh-token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                }
            )
            if (!res.ok) return null
            const json = await res.json()
            const { accessToken, refreshToken: newRT } = json?.data ?? {}
            if (!accessToken || !newRT) return null
            return { accessToken, refreshToken: newRT }
        } catch {
            return null
        } finally {
            guestRefreshPromise = null
        }
    })()

    return guestRefreshPromise
}
async function toNextResponse(upstream: Response): Promise<NextResponse> {
    const contentType = upstream.headers.get('content-type') ?? 'application/json'
    return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: { 'content-type': contentType },
    })
}

// ─── Main proxy ───────────────────────────────────────────────────────────────

/**
 * Forward request tới microservice, tự động refresh token khi gặp 401.
 *
 * Flow:
 * 1. Đọc cookie đúng loại (accessToken hoặc guestAccessToken)
 * 2. Forward request kèm Bearer token (hoặc không nếu không có cookie)
 * 3. Nếu backend trả 401:
 *    - Gọi refresh endpoint tương ứng (staff hoặc guest)
 *    - Nếu refresh thành công → retry request với token mới + set cookie mới
 *    - Nếu refresh thất bại → trả 401 + xóa cookie cũ (session chết)
 *
 * FIX so với bản cũ: bỏ điều kiện `&& token` khỏi check 401.
 * Lý do: khi accessToken cookie đã hết hạn (browser xóa), token = null,
 * nhưng refreshToken vẫn có thể còn hiệu lực. Cần thử refresh trong cả
 * trường hợp này chứ không chỉ khi backend từ chối token còn tồn tại.
 */
export async function proxyRequest(
    request: NextRequest,
    pathSegments: string[]
): Promise<NextResponse> {
    const [service, ...rest] = pathSegments
    const entry = SERVICE_MAP[service as ServiceName]

    if (!entry) {
        return NextResponse.json(
            { message: `Unknown service: ${service}` },
            { status: 404 }
        )
    }

    // ── Lấy token từ cookie ──────────────────────────────────────────────────
    const cookieStore = await cookies()
    const tokenCookieName = entry.auth === 'guest' ? 'guestAccessToken' : 'accessToken'
    const token = entry.auth === 'none'
        ? null
        : cookieStore.get(tokenCookieName)?.value ?? null

    // ── Build target URL ─────────────────────────────────────────────────────
    const search = request.nextUrl.search ?? ''
    const targetUrl = `${entry.baseUrl}/${rest.join('/')}${search}`

    // ── Buffer body một lần để có thể gửi lại khi retry ─────────────────────
    const hasBody = !['GET', 'HEAD'].includes(request.method)
    const bodyBuffer = hasBody ? await request.arrayBuffer() : undefined

    const doFetch = (bearer: string | null) => {
        const headers = new Headers()
        request.headers.forEach((value, key) => {
            if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value)
        })
        if (bearer) {
            headers.set('Authorization', `Bearer ${bearer}`)
        } else {
            headers.delete('Authorization')
        }
        return fetch(targetUrl, {
            method: request.method,
            headers,
            body: hasBody ? bodyBuffer : undefined,
        })
    }

    // ── Initial request ──────────────────────────────────────────────────────
    let upstream = await doFetch(token)

    // ── Silent refresh khi 401 ───────────────────────────────────────────────
    // FIX: bỏ `&& token` — refresh cả khi cookie accessToken đã hết hạn/bị xóa.
    // `entry.auth !== 'none'` đảm bảo không retry cho public endpoints.
    if (upstream.status === 401 && entry.auth !== 'none') {
        const refreshFn = entry.auth === 'guest' ? refreshGuestToken : refreshStaffToken
        const refreshed = await refreshFn()

        // if (refreshed) {
        //     // Retry với token mới
        //     upstream = await doFetch(refreshed.accessToken)
        //     const finalRes = await toNextResponse(upstream)

        //     // Set cookie mới vào response để browser cập nhật
        //     setAuthCookies(
        //         finalRes,
        //         entry.auth === 'guest' ? 'guestAccessToken' : 'accessToken',
        //         entry.auth === 'guest' ? 'guestRefreshToken' : 'refreshToken',
        //         refreshed.accessToken,
        //         refreshed.refreshToken,
        //     )
        //     return finalRes
        // }

        if (refreshed) {
            upstream = await doFetch(refreshed.accessToken)
            const finalRes = await toNextResponse(upstream)

            if (entry.auth === 'guest') {
                // guest vẫn giữ nguyên cách cũ
                setAuthCookies(finalRes, 'guestAccessToken', 'guestRefreshToken',
                    refreshed.accessToken, refreshed.refreshToken)
            } else {
                setStaffCookiesOnResponse(finalRes, refreshed) // ← dùng helper mới
            }
            return finalRes
        }


        // Refresh thất bại → session chết hoàn toàn, xóa cookie cũ
        // Phía client sẽ nhận 401 → auth.service.ts redirect về /login hoặc /welcome
        const deadRes = await toNextResponse(upstream)
        clearAuthCookies(deadRes, entry.auth)
        return deadRes
    }

    return toNextResponse(upstream)
}
