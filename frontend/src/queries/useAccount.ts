import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import accountApiRequest from '../apiRequests/account.request'
import {
    ChangePasswordBodyType,
    CreateAdminBodyType,
    CreateStaffBodyType,
    UpdateEmployeeBodyType,
    UpdateProfileBodyType
} from '../schema/account.schema'

export const accountKeys = {
    all: (page: number, pageSize: number) => ['account', page, pageSize] as const,
    allAccounts: ['account'] as const,
    detail: (id: number) => ['account', id] as const,
    me: ['account', 'me'] as const
}

import { PAGE_SIZE } from '../config'

// ─── Queries ───────────────────────────────────────
export const useGetAccounts = ({ page = 1, pageSize = PAGE_SIZE }: { page?: number; pageSize?: number }) =>
    useQuery({
        queryKey: accountKeys.all(page, pageSize),
        queryFn: () => accountApiRequest.getAll(page, pageSize),
        placeholderData: keepPreviousData
    })

export const useGetAccount = ({
    id,
    enabled
}: {
    id: number
    enabled: boolean
}) =>
    useQuery({
        queryKey: accountKeys.detail(id),
        queryFn: () => accountApiRequest.getById(id),
        enabled
    })

export const useGetMe = () =>
    useQuery({
        queryKey: accountKeys.me,
        queryFn: accountApiRequest.getMe
    })

// ─── Mutations ─────────────────────────────────────
export const useCreateAdminMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (body: CreateAdminBodyType) => accountApiRequest.createAdmin(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountKeys.allAccounts })
        }
    })
}
export const useCreateStaffMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (body: CreateStaffBodyType) => accountApiRequest.createStaff(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountKeys.allAccounts })
        }
    })
}

export const useUpdateEmployeeMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateEmployeeBodyType & { id: number }) =>
            accountApiRequest.updateEmployee(id, body),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: accountKeys.allAccounts })
            queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.id) })
        }
    })
}

export const useDeleteEmployeeMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => accountApiRequest.deleteEmployee(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountKeys.allAccounts })
        }
    })
}

export const useUpdateMeMutation = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (body: UpdateProfileBodyType) => accountApiRequest.updateMe(body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountKeys.me })
        }
    })
}

export const useChangePasswordMutation = () =>
    useMutation({
        mutationFn: (body: ChangePasswordBodyType) =>
            accountApiRequest.changePassword(body)
    })