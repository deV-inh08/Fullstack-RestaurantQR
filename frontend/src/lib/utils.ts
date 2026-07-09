import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UseFormSetError } from 'react-hook-form'
import { EntityError } from "../lib/http"
import { toast } from "sonner"
import jwt, { JwtPayload } from "jsonwebtoken"
import envConfig from "../config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const normalizePath = (path: string) => {
  return path.startsWith('/') ? path.slice(1) : path
}

export function getClientCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

// decodeToken vẫn giữ lại vì middleware.ts cần decode JWT đọc từ cookie ở
// server-side để biết role — đây là việc hợp lệ, không phải lưu token ở
// client. KHÔNG còn setAccessTokenToLocalStorage / getAccessTokenFromLocalStorage /
// removeTokensFromLS nữa — token không còn được phép chạm localStorage.
export const decodeToken = (token: string): JwtPayload | string | null => {
  return jwt.decode(token)
}

export const formatCurrency = (number: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number)
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export const handleErrorApi = ({
  error,
  setError,
  duration
}: {
  error: any
  setError?: UseFormSetError<any>
  duration?: number
}) => {
  if (error instanceof EntityError && setError) {
    error.payload.errors.forEach((item) => {
      setError(item.field, {
        type: 'server',
        message: item.message
      })
    })
  } else {
    toast(error?.payload?.message ?? 'Lỗi không xác định', {
      duration: duration ?? 5000
    })
  }
}

export const handleImageURL = (path: string) => {
  // imagePath có thể là relative path hoặc full URL
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${envConfig.NEXT_PUBLIC_MENU_ASSETS_URL}${path.startsWith('/') ? '' : '/'}${path}`
}



