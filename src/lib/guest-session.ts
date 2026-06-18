/**
 * Guest token KHÔNG còn lưu ở sessionStorage nữa — chúng nằm trong httpOnly
 * cookie (guestAccessToken / guestRefreshToken) do route handler
 * /api/guest-auth/* set. File này giờ chỉ giữ thông tin HIỂN THỊ (tên khách,
 * số bàn) — không phải dữ liệu xác thực, JS phía client không cần và không
 * được phép đọc token nữa.
 */

const KEYS = {
    NAME: 'guestName',
    TABLE_NUMBER: 'guestTableNumber',
} as const

const isBrowser = typeof window !== 'undefined'

export const setGuestInfo = (name: string, tableNumber: number) => {
    if (!isBrowser) return
    sessionStorage.setItem(KEYS.NAME, name)
    sessionStorage.setItem(KEYS.TABLE_NUMBER, String(tableNumber))
}

export const getGuestInfo = () => {
    if (!isBrowser) return null
    const name = sessionStorage.getItem(KEYS.NAME)
    const tableNumber = sessionStorage.getItem(KEYS.TABLE_NUMBER)
    if (!name || !tableNumber) return null
    return { name, tableNumber: Number(tableNumber) }
}

export const clearGuestSession = () => {
    if (!isBrowser) return
    Object.values(KEYS).forEach(k => sessionStorage.removeItem(k))
}

// Không còn cách nào để JS đọc token guest (nó là httpOnly), nên "đã đăng
// nhập" được suy ra từ việc có guest info hiển thị hay không. Phiên có thật
// sự còn sống hay không do API tự quyết — nếu cookie hết hạn, các trang gọi
// guest API sẽ nhận 401 và tự redirect về welcome (xem auth.service.ts).
export const isGuestLoggedIn = (): boolean => Boolean(getGuestInfo())
