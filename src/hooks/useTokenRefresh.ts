'use client'

import { useEffect, useRef, useCallback } from 'react'

function readAtExpiresAt(): number | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith('atExpiresAt='))
    if (!match) return null
    const val = Number(match.split('=')[1])
    return isNaN(val) ? null : val
}

export function useTokenRefresh(bufferSeconds = 30) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const schedule = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)

        const exp = readAtExpiresAt()
        if (!exp) return

        const nowSec = Math.floor(Date.now() / 1000)
        const secondsLeft = exp - nowSec

        // Đã hết hạn hoặc sắp hết → refresh ngay
        const delay = Math.max(0, (secondsLeft - bufferSeconds) * 1000)

        timerRef.current = setTimeout(async () => {
            try {
                const res = await fetch('/api/auth/refresh-token', {
                    method: 'POST',
                })
                if (res.ok) {
                    schedule()
                } else {
                    window.location.href = '/login'
                }
            } catch {
                timerRef.current = setTimeout(schedule, 5000)
            }
        }, delay)
    }, [bufferSeconds])

    useEffect(() => {
        schedule()
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [schedule])
}