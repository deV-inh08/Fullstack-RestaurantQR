'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/src/components/ui/button'
import { useRouter } from '@/src/i18n/navigation'

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error('[AdminError]', error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mb-2 text-2xl font-bold uppercase tracking-wide text-foreground">
                Lỗi trang
            </h1>
            <p className="mb-2 text-sm text-muted-foreground max-w-md">
                {error.message || 'Không thể tải trang này. Vui lòng thử lại.'}
            </p>
            {error.digest && (
                <p className="mb-8 font-mono text-xs text-muted-foreground/60">
                    Mã lỗi: {error.digest}
                </p>
            )}
            <div className="flex gap-3">
                <Button onClick={reset}
                    className="gap-2 rounded-md bg-primary font-bold uppercase tracking-wide text-primary-foreground shadow-md hover:shadow-gold">
                    <RefreshCw className="h-4 w-4" />
                    Thử lại
                </Button>
                <Button variant="outline" onClick={() => router.push('/admin')}
                    className="gap-2 rounded-md border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle">
                    <ArrowLeft className="h-4 w-4" />
                    Dashboard
                </Button>
            </div>
        </div>
    )
}