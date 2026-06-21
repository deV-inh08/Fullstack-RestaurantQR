import HTTP_STATUS from '../constants/http-status'
import envConfig from '../config'
import { handleUnauthorized } from '../services/auth.service'
import { normalizePath } from './utils'


type ServiceName = 'identity' | 'menu' | 'order' | 'reservation' | 'guest'
type CustomOptions = Omit<RequestInit, 'method'> & {
    baseUrl?: string,
    service?: ServiceName
}


export class HttpError extends Error {
    constructor(
        public status: number,
        public payload: {
            message: string;
            [key: string]: any
        },
        message = 'HTTP Error'
    ) {
        super(message)
    }
}

export class EntityError extends HttpError {
    constructor(
        public payload: {
            message: string
            errors: {
                field: string;
                message: string
            }[]
        }
    ) {
        super(HTTP_STATUS.UNPROCESSABLE_ENTITY, payload, 'Entity Error')
        Object.setPrototypeOf(this, EntityError.prototype)
    }
}



const request = async <TResponse>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    options?: CustomOptions
) => {

    const { baseUrl, service, body: rawBody, headers: rawHeaders, ...restFetchOptions } = options ?? {}

    // ─── 2. Xác định body và Content-Type ────────────────────────────────────
    // Hầu hết các request body có dạng: Json, Form --> 90%
    // 10 % còn lại là Text, XML, Binary,....
    // Code này chưa tối ưu, còn thiếu check 10 % còn lại.

    // Khi body là FormData:
    //   - KHÔNG set Content-Type thủ công
    //   - Browser sẽ tự set "multipart/form-data; boundary=<uuid>" 
    //   - Nếu ta set thủ công thì thiếu boundary → server reject → 415
    // Khi body là object/primitive:
    //   - Stringify thành JSON
    //   - Set Content-Type: application/json
    const isFormData = rawBody instanceof FormData

    const body: BodyInit | undefined = isFormData
        ? rawBody
        : rawBody != null
            ? JSON.stringify(rawBody)
            : undefined

    const baseHeaders: Record<string, string> = isFormData
        ? {}
        : { 'Content-Type': 'application/json' }



    // Mọi request đều same-origin tới chính Next.js server — KHÔNG còn gọi
    // thẳng sang microservice, KHÔNG còn tự gắn Bearer token từ localStorage.
    // httpOnly cookie được browser tự gửi kèm; route handler ở server đọc và
    // forward Authorization header hộ mình (xem lib/server-fetch.ts).
    // Nếu baseURL = '' --> thì gọi đến nextjs server
    // const resolvedBaseUrl = baseUrl ?? (service ? `/api/${service}` : '/api/identity')
    // const fullUrl = `${resolvedBaseUrl}/${normalizePath(url)}`

    // ─── Xác định Base URL linh hoạt giữa Client và Server ───────────────────
    let resolvedBaseUrl = ''

    if (baseUrl !== undefined) {
        resolvedBaseUrl = baseUrl
    } else {
        // 1. Nếu chạy ở môi trường Trình duyệt (Next Client Component)
        if (typeof window !== 'undefined') {
            // Client luôn gọi tương đối về Route Handler của Next.js để Browser tự đính Cookie
            resolvedBaseUrl = service ? `/api/${service}` : '/api/identity'
        }
        // 2. Nếu chạy ở môi trường Next.js Server (Route Handler / SSR gọi sang .NET)
        else {
            // Sử dụng biến môi trường bảo mật của Server (Server-only), không có chữ NEXT_PUBLIC_
            const gatewayUrl = process.env.API_GATEWAY_URL

            if (gatewayUrl) {
                resolvedBaseUrl = gatewayUrl
            } else {
                // Phương án dự phòng cực tốt: Nếu không qua Gateway, tự động map sang URL của từng Microservice
                const serviceMapping: Record<string, string | undefined> = {
                    identity: process.env.IDENTITY_API_URL,
                    menu: process.env.MENU_API_URL,
                    order: process.env.ORDER_API_URL,
                    guest: process.env.ORDER_API_URL,
                    reservation: process.env.RESERVATION_API_URL
                }
                // Nếu không tìm thấy cấu hình cụ thể nào thì mới fallback về default gateway lúc dev
                resolvedBaseUrl = serviceMapping[service || 'identity'] || 'http://localhost:5000/api/v1'
            }
        }
    }

    const fullUrl = `${resolvedBaseUrl}/${normalizePath(url)}`

    const res = await fetch(fullUrl, {
        ...restFetchOptions,
        headers: { ...baseHeaders, ...(rawHeaders as Record<string, string> ?? {}) },
        body,
        method
    })

    const responseText = await res.text()
    let payload: TResponse
    try {
        payload = JSON.parse(responseText)
    } catch {
        // Response body is empty or not valid JSON
        throw new HttpError(res.status, {
            message: `Server returned ${res.status} with non-JSON response`
        })
    }
    const data = { status: res.status, payload }

    // if fetch URL failed
    if (!res.ok) {
        if (res.status === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
            throw new EntityError(payload as any)
        }
        if (res.status === HTTP_STATUS.UNAUTHORIZED) {
            await handleUnauthorized?.()
        }
        throw new HttpError(res.status, payload as any)
    }

    return data
}

const http = {
    get: <TResponse>(url: string, options?: Omit<CustomOptions, 'body'>) =>
        request<TResponse>('GET', url, { ...options }),
    post: <TResponse>(url: string, body: any, options?: Omit<CustomOptions, 'body'>) =>
        request<TResponse>('POST', url, { ...options, body }),
    put: <TResponse>(url: string, body: any, options?: Omit<CustomOptions, 'body'>) =>
        request<TResponse>('PUT', url, { ...options, body }),
    delete: <TResponse>(url: string, options?: Omit<CustomOptions, 'body'>) =>
        request<TResponse>('DELETE', url, options),
    patch: <TResponse>(url: string, body: any, options?: Omit<CustomOptions, 'body'>) =>
        request<TResponse>('PATCH', url, { ...options, body }),
}

export default http