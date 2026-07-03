import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import HomeView from './home-view'

type Props = {
  params: Promise<{ locale: string }>
}

// generateMetadata đa ngôn ngữ CHO RIÊNG trang chủ — override metadata mặc định
// đã khai báo ở src/app/[locale]/layout.tsx. Đây là ví dụ chuẩn cho mọi page.tsx khác.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata.home' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

// page.tsx là Server Component (không có "use client") nên có thể export
// generateMetadata. Toàn bộ UI tương tác được đẩy xuống <HomeView /> (Client Component).
export default function HomePage() {
  return <HomeView />
}
