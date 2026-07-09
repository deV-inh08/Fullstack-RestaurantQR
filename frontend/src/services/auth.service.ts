import { clearGuestSession } from '../lib/guest-session'

const isClient = typeof window !== 'undefined'

function extractTableIdFromPath(): string {
    const match = window.location.pathname.match(/^\/table\/(\d+)/)
    return match?.[1] ?? ''
}

let clientLogoutRequest: Promise<void | Response> | null = null

/**
 * Tới được đây nghĩa là proxy ở server (lib/server-fetch.ts) đã thử
 * silent-refresh và THẤT BẠI rồi mới trả 401 xuống client — nên ở đây
 * KHÔNG còn refresh lại lần nữa (không còn localStorage/sessionStorage token
 * nào để refresh nữa cả), chỉ còn việc dọn dẹp + điều hướng.
 */
export async function handleUnauthorized(): Promise<void> {
    if (!isClient) return

    const isGuestRoute = window.location.pathname.startsWith('/table/')

    if (isGuestRoute) {
        clearGuestSession()
        const tableId = extractTableIdFromPath()
        window.location.href = `/table/${tableId}/welcome`
        return
    }

    if (!clientLogoutRequest) {
        clientLogoutRequest = fetch('/api/auth/logout', { method: 'POST' })
            .catch(() => { })
            .finally(() => {
                clientLogoutRequest = null
                window.location.href = '/login'
            })
    }
    await clientLogoutRequest
}
