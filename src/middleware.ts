import { NextResponse, type NextRequest } from "next/server";
import { Roles, type RoleType } from "@/src/constants/role";
import { decodeToken } from "./lib/utils";

const adminPaths = ['/admin']
const loginPaths = ['/login']
const privatePaths = [...adminPaths]

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const accessToken = request.cookies.get('accessToken')?.value
    const refreshToken = request.cookies.get('refreshToken')?.value

    // ── 1. Không có refreshToken → chưa đăng nhập ───────────────────────────
    if (privatePaths.some(p => pathname.startsWith(p)) && !refreshToken) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // ── 2. refreshToken có nhưng accessToken đã hết hạn (cookie bị browser xóa)
    //       → gọi trực tiếp Identity.API để refresh
    //
    //    Tại sao gọi thẳng BE thay vì qua route handler /api/auth/refresh-token?
    //    Middleware chạy trước tất cả route handlers, không thể dùng server-fetch.ts.
    //    Đây là server-to-server call (middleware chạy ở server), không vi phạm BFF.
    //
    //    IDENTITY_API_URL phải bao gồm base path, ví dụ: http://identity:3001/api/v1
    //    → endpoint đầy đủ: http://identity:3001/api/v1/auth/refresh-token
    //
    //    BE Identity.API endpoint:
    //      POST /api/v1/auth/refresh-token
    //      Body: { refreshToken: string }          ← RefreshTokenRequest record
    //      Response: { message, data: { accessToken, refreshToken } }
    if (privatePaths.some(p => pathname.startsWith(p)) && refreshToken && !accessToken) {
        const identityUrl = process.env.IDENTITY_API_URL
        if (!identityUrl) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        try {
            const res = await fetch(`${identityUrl}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            })


            if (!res.ok) {
                // Refresh token hết hạn hoặc bị revoke
                // (ChangePassword xóa toàn bộ RT, Logout xóa RT cụ thể)
                const redirect = NextResponse.redirect(new URL('/login', request.url))
                redirect.cookies.delete('accessToken')
                redirect.cookies.delete('refreshToken')
                return redirect
            }

            // Response: { message, data: { accessToken, refreshToken } }
            const json = await res.json()
            console.log("middleware__res", json.data)

            const { accessToken: newAT, refreshToken: newRT } = json.data

            const decodedAT = decodeToken(newAT) as { exp: number } | null
            const decodedRT = decodeToken(newRT) as { exp: number } | null

            const response = NextResponse.next()
            response.cookies.set('accessToken', newAT, {
                httpOnly: true,
                expires: decodedAT?.exp ? new Date(decodedAT.exp * 1000) : undefined,
                sameSite: 'lax',
                path: '/',
                secure: true,
            })
            response.cookies.set('refreshToken', newRT, {
                httpOnly: true,
                expires: decodedRT?.exp ? new Date(decodedRT.exp * 1000) : undefined,
                sameSite: 'lax',
                path: '/',
                secure: true,
            })

            response.cookies.set('atExpiresAt', String(decodedAT?.exp ?? 0), {
                httpOnly: false,
                expires: decodedAT?.exp ? new Date(decodedAT.exp * 1000) : undefined,
                sameSite: 'lax',
                path: '/',
            })
            return response

        } catch {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // ── 3. Có cả hai token → kiểm tra quyền ─────────────────────────────────
    if (accessToken) {
        const decoded = decodeToken(accessToken) as { role: RoleType } | null
        const role = decoded?.role

        if (loginPaths.some(p => pathname.startsWith(p))) {
            return NextResponse.redirect(new URL('/admin', request.url))
        }

        if (adminPaths.some(p => pathname.startsWith(p))) {
            const allowedRoles: RoleType[] = [Roles.Admin, Roles.SuperAdmin, Roles.Staff]
            if (!role || !allowedRoles.includes(role)) {
                return NextResponse.redirect(new URL('/', request.url))
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/login']
}