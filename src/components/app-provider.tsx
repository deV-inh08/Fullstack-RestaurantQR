'use client'
import React, { useEffect } from "react"
import { create } from 'zustand'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RoleType } from '../constants/role'
import { useGetMe } from '../queries/useAccount'

interface AppProviderState {
    isAuth: boolean
    role: RoleType | undefined
    setRole: (role?: RoleType) => void
}

export const useAppProviderStore = create<AppProviderState>()((set) => ({
    isAuth: false,
    role: undefined,
    setRole: (role) => set({ role, isAuth: Boolean(role) }),
}))

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            refetchOnMount: true,
        }
    }
})

/**
 * Không còn decode JWT từ localStorage nữa. Role giờ lấy bằng cách hỏi
 * server qua getMe() (đi qua BFF proxy, server tự đọc httpOnly cookie và
 * gắn Authorization hộ). Trên trang public/guest, request này trả 401 —
 * đó là kết quả mong đợi, không phải lỗi cần xử lý đặc biệt.
 *
 * Phải nằm trong component CON của QueryClientProvider vì useGetMe() dùng
 * useQuery.
 */
function AuthBootstrap() {
    const setRole = useAppProviderStore((state) => state.setRole)
    const { data, isError } = useGetMe()

    useEffect(() => {
        if (data?.payload?.data?.role) {
            setRole(data.payload.data.role as RoleType)
        } else if (isError) {
            setRole(undefined)
        }
    }, [data, isError, setRole])

    return null
}

function AppProvider({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthBootstrap />
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    )
}

export default AppProvider
