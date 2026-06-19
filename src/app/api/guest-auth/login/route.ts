import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import serverConfig from '@/src/config.server'
import type { decodedToken } from '@/src/types/token.type'
import type { GuestLoginBodyType } from '@/src/schema/guest.schema'

export const POST = async (request: Request) => {
    const body = (await request.json()) as GuestLoginBodyType
    const cookieStore = await cookies()

    const res = await fetch(`${serverConfig.ORDER_API_URL}/guest/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const json = await res.json()

    if (!res.ok) {
        return Response.json(json, { status: res.status })
    }

    const { accessToken, refreshToken, guest } = json.data

    const decodedAccess = jwt.decode(accessToken) as decodedToken
    const decodedRefresh = jwt.decode(refreshToken) as decodedToken

    cookieStore.set('guestAccessToken', accessToken, {
        httpOnly: true, sameSite: 'lax', path: '/', secure: true,
        expires: new Date(decodedAccess.exp * 1000),
    })
    cookieStore.set('guestRefreshToken', refreshToken, {
        httpOnly: true, sameSite: 'lax', path: '/', secure: true,
        expires: new Date(decodedRefresh.exp * 1000),
    })

    // Token không bao giờ ra tới client — chỉ thông tin guest profile thôi.
    return Response.json({ message: json.message, data: { guest } })
}