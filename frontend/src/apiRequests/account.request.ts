import http from '../lib/http'

import {
    AccountListResType, AccountResType,
    ChangePasswordBodyType,
    CreateAdminBodyType,
    CreateStaffBodyType,
    UpdateEmployeeBodyType,
    UpdateProfileBodyType
} from '../schema/account.schema'

/**
 * All account requests route to Identity.API via service: 'identity'.
 * The http.ts layer auto-attaches the Bearer token from localStorage
 * for all direct backend calls (baseUrl !== '').
 */
const accountApiRequest = {
    // ─── List / Get ──────────────────────────────────
    getAll: (page = 1, pageSize = 20) =>
        http.get<{ data: AccountListResType }>(`/account?page=${page}&pageSize=${pageSize}`, { service: 'identity' }),

    getById: (id: number) =>
        http.get<AccountResType>(`/account/${id}`, { service: 'identity' }),

    // ─── Profile (self) ──────────────────────────────
    getMe: () =>
        http.get<AccountResType>('/account/me', { service: 'identity' }),

    updateMe: (body: UpdateProfileBodyType) =>
        http.put<AccountResType>('/account/me', body, { service: 'identity' }),

    changePassword: (body: ChangePasswordBodyType) =>
        http.put<{ message: string }>('/account/change-password', body, {
            service: 'identity'
        }),

    // ─── Admin CRUD (SuperAdmin only) ─────────────────  ← NEW
    createAdmin: (body: CreateAdminBodyType) =>
        http.post<AccountResType>('/account/admin', body, { service: 'identity' }),


    // ─── Staff CRUD (Admin manages Staff) ────────────
    createStaff: (body: CreateStaffBodyType) =>
        http.post<AccountResType>('/account/staff', body, {
            service: 'identity'
        }),

    updateEmployee: (id: number, body: UpdateEmployeeBodyType) =>
        http.put<AccountResType>(`/account/${id}`, body, {
            service: 'identity'
        }),

    deleteEmployee: (id: number) =>
        http.delete<AccountResType>(`/account/${id}`, {
            service: 'identity'
        })
}

export default accountApiRequest