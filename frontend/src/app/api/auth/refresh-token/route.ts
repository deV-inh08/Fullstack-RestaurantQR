import authApiRequest from "@/src/apiRequests/auth.request"
import { cookies } from "next/headers"
import jwt from 'jsonwebtoken'
import { HttpError } from "@/src/lib/http"
import { decodedToken } from "@/src/types/token.type"
import { setStaffCookies } from "@/src/lib/set-auth-cookies"

export const POST = async (_request: Request) => {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (!refreshToken) {
        return Response.json({ message: 'Refresh token not found' }, { status: 401 })
    }

    try {
        const res = await authApiRequest.serverRefreshToken({ refreshToken })
        const { accessToken, refreshToken: newRefreshToken } = res.payload.data

        await setStaffCookies({ accessToken, refreshToken: newRefreshToken })

        // const decodedAccessToken = jwt.decode(accessToken) as decodedToken
        // const decodedRefreshToken = jwt.decode(newRefreshToken) as decodedToken

        // cookieStore.set('accessToken', accessToken, {
        //     httpOnly: true,
        //     expires: new Date(decodedAccessToken.exp * 1000),
        //     sameSite: 'lax',
        //     path: '/',
        //     secure: true,
        // })
        // cookieStore.set('refreshToken', newRefreshToken, {
        //     httpOnly: true,
        //     expires: new Date(decodedRefreshToken.exp * 1000),
        //     sameSite: 'lax',
        //     path: '/',
        //     secure: true,
        // })

        return Response.json(res.payload)
    } catch (error) {
        cookieStore.delete('accessToken')
        cookieStore.delete('refreshToken')
        cookieStore.delete('atExpiresAt')
        if (error instanceof HttpError) {
            return Response.json(error.payload, { status: error.status })
        }
        return Response.json({ message: 'Failed to refresh token' }, { status: 401 })
    }
}