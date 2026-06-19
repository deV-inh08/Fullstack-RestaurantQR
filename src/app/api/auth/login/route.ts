import authApiRequest from "@/src/apiRequests/auth.request"
import { LoginBodyType } from "@/src/schema/auth.schema"
import { cookies } from "next/headers"
import jwt from 'jsonwebtoken'
import { HttpError } from "@/src/lib/http"
import { decodedToken } from "@/src/types/token.type"
/**
 * Flow: Next client -> Next Server(proxy) -> Main Server
 * 
 * Next Client -> (request) with data (email, password) -> Next Server 
 * Next Server receipt 'data' (email, password) -> (request) -> Main Server
 * Main Server -> return for Next Server (payload)
 * Next get payload (token) -> Set cookie (Client)
 */
export const POST = async (request: Request) => {
    const body = (await request.json()) as LoginBodyType
    console.log("Server body", body)
    const cookieStore = await cookies()
    try {
        const res = await authApiRequest.serverLogin(body)
        const { accessToken, refreshToken } = res.payload.data
        const decodedAccessToken = jwt.decode(accessToken) as decodedToken
        const decodedRefreshToken = jwt.decode(refreshToken) as decodedToken
        cookieStore.set('accessToken', accessToken, {
            httpOnly: true,
            expires: new Date(decodedAccessToken.exp * 1000),
            sameSite: 'lax',
            path: '/',
            secure: true

        })
        cookieStore.set('refreshToken', refreshToken, {
            httpOnly: true,
            expires: new Date(decodedRefreshToken.exp * 1000),
            sameSite: 'lax',
            path: '/',
            secure: true
        })
        return Response.json(res.payload)
    } catch (error) {
        if (error instanceof HttpError) {
            return Response.json(error.payload, {
                status: error.status
            })
        } else {
            console.error('Login route error:', error)
            return Response.json({
                message: 'Error',
                status: 500
            })
        }
    }
}