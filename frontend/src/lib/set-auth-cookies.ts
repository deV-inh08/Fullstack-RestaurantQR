// src/lib/set-auth-cookies.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import type { decodedToken } from '@/src/types/token.type'

interface TokenPair {
    accessToken: string
    refreshToken: string
}

// Dùng trong Route Handler (cookies() từ next/headers)
export async function setStaffCookies({ accessToken, refreshToken }: TokenPair) {
    const cookieStore = await cookies()
    const decodedAT = jwt.decode(accessToken) as decodedToken
    const decodedRT = jwt.decode(refreshToken) as decodedToken

    cookieStore.set('accessToken', accessToken, {
        httpOnly: true,
        expires: new Date(decodedAT.exp * 1000),
        sameSite: 'lax',
        path: '/',
        secure: true,
    })
    cookieStore.set('refreshToken', refreshToken, {
        httpOnly: true,
        expires: new Date(decodedRT.exp * 1000),
        sameSite: 'lax',
        path: '/',
        secure: true,
    })
    // Cookie này JS client đọc được — chỉ lưu timestamp, không sensitive
    cookieStore.set('atExpiresAt', String(decodedAT.exp), {
        httpOnly: false,
        expires: new Date(decodedAT.exp * 1000),
        sameSite: 'lax',
        path: '/',
    })
}

// Dùng trong server-fetch.ts (set lên NextResponse)
export function setStaffCookiesOnResponse(
    res: NextResponse,
    { accessToken, refreshToken }: TokenPair
) {
    const decodedAT = jwt.decode(accessToken) as decodedToken
    const decodedRT = jwt.decode(refreshToken) as decodedToken

    res.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        expires: new Date(decodedAT.exp * 1000),
        sameSite: 'lax',
        path: '/',
        secure: true,
    })
    res.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        expires: new Date(decodedRT.exp * 1000),
        sameSite: 'lax',
        path: '/',
        secure: true,
    })
    res.cookies.set('atExpiresAt', String(decodedAT.exp), {
        httpOnly: false,
        expires: new Date(decodedAT.exp * 1000),
        sameSite: 'lax',
        path: '/',
    })
}