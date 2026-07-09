'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { usePathname, useRouter } from '@/src/i18n/navigation'
import { routing } from '@/src/i18n/routing'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'

// Client Component — chọn locale từ dropdown nhưng giữ nguyên path hiện tại
// (vd: /vi/admin/dishes -> /en/admin/dishes)
export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname() // pathname KHÔNG bao gồm locale prefix (next-intl tự bỏ)
  const params = useParams()

  function handleChange(nextLocale: string) {
    router.replace(
      // @ts-expect-error -- pathname không có kiểu literal union khi có dynamic segments
      { pathname, params },
      { locale: nextLocale }
    )
  }

  return (
    <Select value={locale} onValueChange={handleChange} >
      <SelectTrigger size="sm" className="w-17 text-xs uppercase tracking-wide border-[#ccccc] cursor-pointer">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((loc) => (
          <SelectItem key={loc} value={loc} className="text-xs uppercase tracking-wide">
            {t(loc)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
