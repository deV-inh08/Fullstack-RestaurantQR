import './globals.css'

// Root layout bắt buộc phải tồn tại trong App Router, nhưng khi dùng next-intl
// với segment [locale], toàn bộ <html>/<body> và providers (theme, query, i18n...)
// được chuyển xuống src/app/[locale]/layout.tsx — nơi đã biết được locale hiện tại.
// Root layout ở đây chỉ là một pass-through, không render <html>/<body> riêng.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
