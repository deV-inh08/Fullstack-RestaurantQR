import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Các API này thay thế next/link và next/navigation trong toàn bộ app.
// Chúng tự động thêm/giữ locale prefix hiện tại khi điều hướng.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
