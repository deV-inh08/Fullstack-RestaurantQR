import z from 'zod'
import { RoleValues } from '../constants/role'

// ─── AccountDto from Identity.API ──────────────────
export const AccountSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.string(), // "SuperAdmin" | "Admin" | "Staff"
    avatar: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date()
})

export type AccountType = z.TypeOf<typeof AccountSchema>

export const AccountListRes = z.object({
    data: z.array(AccountSchema),
    message: z.string(),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
})
export type AccountListResType = z.TypeOf<typeof AccountListRes>

export const AccountRes = z.object({
    data: AccountSchema,
    message: z.string()
})
export type AccountResType = z.TypeOf<typeof AccountRes>

export const CreateAdminBody = z
    .object({
        name: z.string().trim().min(2).max(256),
        email: z.string().email('Email không hợp lệ'),
        password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
        confirmPassword: z.string().min(6).max(100)
    })
    .superRefine(({ confirmPassword, password }, ctx) => {
        if (confirmPassword !== password) {
            ctx.addIssue({
                code: 'custom',
                message: 'Mật khẩu không khớp',
                path: ['confirmPassword']
            })
        }
    })
export type CreateAdminBodyType = z.TypeOf<typeof CreateAdminBody>

// ─── Create Staff (Admin creates Staff) ────────────
export const CreateStaffBody = z
    .object({
        name: z.string().trim().min(2).max(256),
        email: z.string().email('Email không hợp lệ'),
        password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
        confirmPassword: z.string().min(6).max(100)
    })
    .superRefine(({ confirmPassword, password }, ctx) => {
        if (confirmPassword !== password) {
            ctx.addIssue({
                code: 'custom',
                message: 'Mật khẩu không khớp',
                path: ['confirmPassword']
            })
        }
    })

export type CreateStaffBodyType = z.TypeOf<typeof CreateStaffBody>

// ─── Update Employee ────────────────────────────────
export const UpdateEmployeeBody = z
    .object({
        name: z.string().trim().min(2).max(256),
        email: z.string().email(),
        avatar: z.string().url().optional().nullable()
    })

export type UpdateEmployeeBodyType = z.TypeOf<typeof UpdateEmployeeBody>

// ─── Update Profile (self) ──────────────────────────
export const UpdateProfileBody = z.object({
    name: z.string().trim().min(2).max(256),
    avatar: z.string().url().optional().nullable()
})
export type UpdateProfileBodyType = z.TypeOf<typeof UpdateProfileBody>

// ─── Change Password ────────────────────────────────
export const ChangePasswordBody = z
    .object({
        oldPassword: z.string().min(6).max(100),
        newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự').max(100),
        confirmPassword: z.string().min(6).max(100)
    })
    .superRefine(({ confirmPassword, newPassword }, ctx) => {
        if (confirmPassword !== newPassword) {
            ctx.addIssue({
                code: 'custom',
                message: 'Mật khẩu xác nhận không khớp',
                path: ['confirmPassword']
            })
        }
    })

export type ChangePasswordBodyType = z.TypeOf<typeof ChangePasswordBody>