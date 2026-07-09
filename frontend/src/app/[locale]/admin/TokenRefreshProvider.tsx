'use client'

import { useTokenRefresh } from '@/src/hooks/useTokenRefresh'

export function TokenRefreshProvider() {
    useTokenRefresh(1) // refresh trước 30 giây khi AT sắp hết hạn
    return null
}