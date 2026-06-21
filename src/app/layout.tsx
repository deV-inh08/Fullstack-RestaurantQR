import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import AppProvider from '../components/app-provider';
import { Toaster } from '@/src/components/ui/sonner'
import { ThemeProvider } from '../components/theme-provider'
import openGraph from "../../public/open_graph.png"
import NextTopLoader from 'nextjs-toploader';

const _inter = Inter({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Thực Đơn Nhà Hàng Viet Gold | Gọi Món QR',
  description: 'Khám phá menu đa dạng tại Viet Gold từ Cơm Tấm Sườn Bì Chả đến Nước Ép Trái Cây tươi ngon. Đặt món nhanh qua mã QR tại bàn.',
  // Open graph
  openGraph: {
    title: 'Thực Đơn Nhà Hàng Viet Gold | Gọi Món QR',
    description: 'Khám phá menu đa dạng tại Viet Gold từ Cơm Tấm Sườn Bì Chả đến Nước Ép Trái Cây tươi ngon. Đặt món nhanh qua mã QR tại bàn.',
    images: [
      {
        url: openGraph.src,
        width: 1200,
        height: 630,
        alt: 'Thực Đơn Nhà Hàng Viet Gold',
      },
    ],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>
          <AppProvider>
            <NextTopLoader showSpinner={false} color="#FFC000"></NextTopLoader>
            {children}
          </AppProvider>
          {process.env.NODE_ENV === 'production' && <Analytics />}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
