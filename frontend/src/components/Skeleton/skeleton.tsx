import { Skeleton } from '@/src/components/ui/skeleton'

interface TableSkeletonProps {
    rows?: number
    cols?: number
}

/**
 * Skeleton loader cho admin table pages.
 * Thay thế "Đang tải..." text để UX tốt hơn.
 */
export function TableSkeleton({ rows = 6, cols = 5 }: TableSkeletonProps) {
    return (
        <div className="w-full">
            {/* Header row */}
            <div className="flex items-center gap-4 border-b border-border-subtle px-4 py-3">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-3 flex-1 rounded" />
                ))}
            </div>
            {/* Data rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                    key={rowIdx}
                    className="flex items-center gap-4 border-b border-border-subtle px-4 py-4"
                >
                    {Array.from({ length: cols }).map((_, colIdx) => (
                        <Skeleton
                            key={colIdx}
                            className="h-4 flex-1 rounded"
                            style={{ opacity: 1 - rowIdx * 0.1 }}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

/** Skeleton cho metric cards trên dashboard */
export function MetricCardSkeleton() {
    return (
        <div className="rounded-md border border-border-subtle bg-card p-6 shadow-card">
            <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-8 w-32 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                </div>
                <Skeleton className="h-12 w-12 rounded-md" />
            </div>
        </div>
    )
}

/** Skeleton cho danh sách order row */
export function OrderRowSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 border-b border-border-subtle px-4 py-4"
                    style={{ opacity: 1 - i * 0.12 }}
                >
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 flex-1 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded" />
                    <Skeleton className="h-8 w-16 rounded" />
                </div>
            ))}
        </>
    )
}