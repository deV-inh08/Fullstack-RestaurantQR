import z from 'zod'
import { RoleValues } from '../constants/role'

export const LoginBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, 'minmaxPassword').max(100, 'minmaxPassword'),
})
export type LoginBodyType = z.TypeOf<typeof LoginBodySchema>

const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(RoleValues),
    avatar: z.string().nullable(),
})

// ── Response THẬT từ Identity.API — chỉ dùng server-to-server, KHÔNG được
// để lọt ra response trả cho client. ──
export const LoginResponse = z.object({
    data: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        account: AccountSchema,
    }),
    message: z.string(),
})
export type LoginResponseType = z.TypeOf<typeof LoginResponse>

// ── Response client THỰC SỰ nhận được từ /api/auth/login — không có token. ──
export const ClientLoginResponse = z.object({
    data: z.object({ account: AccountSchema }),
    message: z.string(),
})
export type ClientLoginResponseType = z.TypeOf<typeof ClientLoginResponse>

export const RefreshTokenBody = z.object({ refreshToken: z.string() }).strict()
export type RefreshTokenBodyType = z.TypeOf<typeof RefreshTokenBody>

export const RefreshTokenRes = z.object({
    data: z.object({ accessToken: z.string(), refreshToken: z.string() }),
    message: z.string(),
})
export type RefreshTokenResponseType = z.TypeOf<typeof RefreshTokenRes>

// Response client nhận từ /api/auth/refresh-token — chỉ cần biết thành công.
export const ClientRefreshTokenRes = z.object({ message: z.string() })
export type ClientRefreshTokenResType = z.TypeOf<typeof ClientRefreshTokenRes>

export const LogoutBody = z.object({ refreshToken: z.string() }).strict()
export type LogoutBodyType = z.TypeOf<typeof LogoutBody>
