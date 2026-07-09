'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/src/components/ui/button'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[GlobalError]', error)
    }, [error])

    return (
        <html lang="en">
            <body className="bg-background">
                <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center bg-background">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold uppercase tracking-wide text-foreground">
                        Đã xảy ra lỗi
                    </h1>
                    <p className="mb-8 max-w-md text-sm text-muted-foreground">
                        {error.message || 'Có lỗi không mong muốn xảy ra. Vui lòng thử lại.'}
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={reset} className="gap-2 rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground">
                            <RefreshCw className="h-4 w-4" />
                            Thử lại
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/'}
                            className="gap-2 rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                            <Home className="h-4 w-4" />
                            Trang chủ
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    )
}