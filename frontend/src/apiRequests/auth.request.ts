import http from '../lib/http'
import {
    LoginBodyType,
    LoginResponseType,
    LogoutBodyType, RefreshTokenBodyType, RefreshTokenResponseType
} from '../schema/auth.schema'


interface AuthApiRequest {
    refreshTokenRequest: Promise<{ payload: RefreshTokenResponseType }> | null;
    serverLogin: (body: LoginBodyType) => Promise<{ status: number, payload: LoginResponseType }>;
    login: (body: LoginBodyType) => Promise<{ status: number, payload: LoginResponseType }>;
    serverLogout: (body: LogoutBodyType & { accessToken: string }) => Promise<{ payload: { message: string } }>;
    logout: () => Promise<{ payload: { message: string } }>;
    refreshToken: () => Promise<{ payload: RefreshTokenResponseType }>;
    serverRefreshToken: (body: RefreshTokenBodyType) => Promise<{ payload: RefreshTokenResponseType }>;
}

const authApiRequest: AuthApiRequest = {
    refreshTokenRequest: null as Promise<{
        status: number
        payload: RefreshTokenResponseType
    }> | null,



    // call 
    serverLogin: (body: LoginBodyType) => http.post<LoginResponseType>('/auth/login', body, { service: 'identity' }),

    // cal BFF
    login: (body: LoginBodyType) =>
        http.post<LoginResponseType>('/api/auth/login', body, {
            baseUrl: ''
        }),

    serverLogout: (
        body
    ) =>
        http.post(
            '/auth/logout',
            {
                refreshToken: body.refreshToken
            },
            {
                service: 'identity',
                headers: {
                    Authorization: `Bearer ${body.accessToken}`
                }

            }
        ),
    // client gọi đến route handler, không cần truyền AT và RT vào body vì AT và RT tự  động gửi thông qua cookie rồi
    logout: () => http.post('/api/auth/logout', null, { baseUrl: '' }),


    serverRefreshToken: (body: RefreshTokenBodyType) =>
        http.post<RefreshTokenResponseType>('/auth/refresh-token', body, { service: 'identity' }),
    async refreshToken() {
        if (this.refreshTokenRequest) {
            return this.refreshTokenRequest
        }
        this.refreshTokenRequest = http.post<RefreshTokenResponseType>(
            '/api/auth/refresh-token',
            null,
            {
                baseUrl: ''
            }
        )
        const result = await this.refreshTokenRequest
        this.refreshTokenRequest = null
        return result
    },


    // setTokenToCookie: (body: { accessToken: string; refreshToken: string }) =>
    //     http.post('/api/auth/token', body, { baseUrl: '' })
}

export default authApiRequest