import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import serverConfig from '@/src/config.server'
import type { decodedToken } from '@/src/types/token.type'

export const POST = async () => {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('guestRefreshToken')?.value

    if (!refreshToken) {
        return Response.json({ message: 'Guest refresh token not found' }, { status: 401 })
    }

    const res = await fetch(`${serverConfig.ORDER_API_URL}/guest/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    })
    const json = await res.json()

    if (!res.ok) {
        cookieStore.delete('guestAccessToken')
        cookieStore.delete('guestRefreshToken')
        return Response.json(json, { status: res.status })
    }

    const { accessToken, refreshToken: newRefreshToken, guest } = json.data
    const decodedAccess = jwt.decode(accessToken) as decodedToken
    const decodedRefresh = jwt.decode(newRefreshToken) as decodedToken

    cookieStore.set('guestAccessToken', accessToken, {
        httpOnly: true, sameSite: 'lax', path: '/', secure: true,
        expires: new Date(decodedAccess.exp * 1000),
    })
    cookieStore.set('guestRefreshToken', newRefreshToken, {
        httpOnly: true, sameSite: 'lax', path: '/', secure: true,
        expires: new Date(decodedRefresh.exp * 1000),
    })

    return Response.json({ message: json.message, data: { guest } })
}
