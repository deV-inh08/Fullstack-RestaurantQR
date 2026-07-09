import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { cn } from '@/src/lib/utils'
import '../globals.css'
import AppProvider from '../../components/app-provider'
import { Toaster } from '@/src/components/ui/sonner'
import { ThemeProvider } from '../../components/theme-provider'
import openGraph from '../../../public/open_graph.png'
import NextTopLoader from 'nextjs-toploader'
import { GoogleAnalytics } from '@next/third-parties/google'
import { routing } from '@/src/i18n/routing'

// next/font tự self-host font, nhưng chỉ nhúng @font-face vào trang khi className/variable
// thực sự được gắn vào JSX — nếu không, các linter "no-unused-vars" sẽ xoá mất lời gọi này.
const inter = Inter({ subsets: ['latin'] })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

// generateStaticParams pre-render sẵn /vi và /en tại build time (SSG cho locale segment)
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

// Metadata mặc định toàn site, dịch theo locale. Từng page vẫn có thể override
// bằng generateMetadata riêng (xem src/app/[locale]/page.tsx).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata.home' })

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: openGraph.src,
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    icons: {
      icon: [
        { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
        { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
        { url: '/icon.svg', type: 'image/svg+xml' },
      ],
      apple: '/apple-icon.png',
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Chặn truy cập locale không hợp lệ (vd: /fr/...) -> 404
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Cho các Server Component con biết locale hiện tại (bắt buộc khi dùng generateStaticParams)
  setRequestLocale(locale)

  const gaId = process.env.NEXT_PUBLIC_GA_ID || ''

  return (
    <html lang={locale} className="bg-background" suppressHydrationWarning>
      <body className={cn(inter.className, geistMono.variable, 'font-sans antialiased bg-background text-foreground')}>
        <NextIntlClientProvider>
          <ThemeProvider>
            <AppProvider>
              <NextTopLoader showSpinner={false} color="#FFC000"></NextTopLoader>
              {children}
            </AppProvider>
            <Analytics />
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
        <GoogleAnalytics gaId={gaId} />
      </body>
    </html>
  )
}
