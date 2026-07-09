import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { Roles, type RoleType } from "@/src/constants/role";
import { decodeToken } from "./lib/utils";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const adminPaths = ['/admin']
const loginPaths = ['/login']
const privatePaths = [...adminPaths]

// "/vi/admin/dishes" -> "/admin/dishes" (bỏ locale prefix để so khớp với adminPaths/loginPaths)
function stripLocale(pathname: string) {
    const segments = pathname.split('/')
    const maybeLocale = segments[1]
    if ((routing.locales as readonly string[]).includes(maybeLocale)) {
        return '/' + segments.slice(2).join('/')
    }
    return pathname
}

function getLocale(pathname: string) {
    const segments = pathname.split('/')
    const maybeLocale = segments[1]
    return (routing.locales as readonly string[]).includes(maybeLocale)
        ? maybeLocale
        : routing.defaultLocale
}

// Redirect nhưng vẫn giữ lại cookie (vd: NEXT_LOCALE) mà next-intl đã set trên `base`
function redirectPreservingCookies(url: URL, base: NextResponse) {
    const response = NextResponse.redirect(url)
    base.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
}

export async function middleware(request: NextRequest) {
    // ── 0. Xử lý locale routing trước (redirect thêm prefix /vi, /en nếu thiếu) ──
    const intlResponse = handleI18nRouting(request)

    // next-intl đã redirect vì URL chưa có locale prefix -> để redirect này chạy,
    // auth sẽ được kiểm tra lại ở request kế tiếp (khi URL đã có locale).
    if (intlResponse.headers.get('location')) {
        return intlResponse
    }

    const { pathname } = request.nextUrl
    const locale = getLocale(pathname)
    const bare = stripLocale(pathname)
    const localizedUrl = (path: string) => new URL(`/${locale}${path}`, request.url)

    const accessToken = request.cookies.get('accessToken')?.value
    const refreshToken = request.cookies.get('refreshToken')?.value

    // ── 1. Không có refreshToken → chưa đăng nhập ───────────────────────────
    if (privatePaths.some(p => bare.startsWith(p)) && !refreshToken) {
        return redirectPreservingCookies(localizedUrl('/login'), intlResponse)
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
    if (privatePaths.some(p => bare.startsWith(p)) && refreshToken && !accessToken) {
        const identityUrl = process.env.IDENTITY_API_URL
        if (!identityUrl) {
            return redirectPreservingCookies(localizedUrl('/login'), intlResponse)
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
                const redirect = redirectPreservingCookies(localizedUrl('/login'), intlResponse)
                redirect.cookies.delete('accessToken')
                redirect.cookies.delete('refreshToken')
                return redirect
            }

            // Response: { message, data: { accessToken, refreshToken } }
            const json = await res.json()

            const { accessToken: newAT, refreshToken: newRT } = json.data

            const decodedAT = decodeToken(newAT) as { exp: number } | null
            const decodedRT = decodeToken(newRT) as { exp: number } | null

            // Tái sử dụng intlResponse để không mất cookie NEXT_LOCALE mà next-intl đã set
            const response = intlResponse
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
            return redirectPreservingCookies(localizedUrl('/login'), intlResponse)
        }
    }

    // ── 3. Có cả hai token → kiểm tra quyền ─────────────────────────────────
    if (accessToken) {
        const decoded = decodeToken(accessToken) as { role: RoleType } | null
        const role = decoded?.role

        if (loginPaths.some(p => bare.startsWith(p))) {
            return redirectPreservingCookies(localizedUrl('/admin'), intlResponse)
        }

        if (adminPaths.some(p => bare.startsWith(p))) {
            const allowedRoles: RoleType[] = [Roles.Admin, Roles.SuperAdmin, Roles.Staff]
            if (!role || !allowedRoles.includes(role)) {
                return redirectPreservingCookies(localizedUrl('/'), intlResponse)
            }
        }
    }

    return intlResponse
}

export const config = {
    // Chạy middleware trên mọi route "trang" (không phải api/static) để next-intl
    // có thể xử lý locale routing, đồng thời vẫn cover /admin và /login cho auth.
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
