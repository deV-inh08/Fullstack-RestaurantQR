export default function GuestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[440px]">
        {children}
      </div>
    </div>
  )
}
