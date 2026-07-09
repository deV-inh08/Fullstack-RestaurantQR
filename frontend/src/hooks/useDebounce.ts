import { useState, useEffect } from 'react'

/**
 * Trả về giá trị debounced sau `delay` ms.
 * Dùng để tránh gọi API hoặc push router liên tục khi user đang gõ.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}