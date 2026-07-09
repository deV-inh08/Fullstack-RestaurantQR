import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/src/components/ui/pagination"

interface PaginationV1Props {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

const PaginationV1 = ({ page, totalPages, onPageChange }: PaginationV1Props) => {
    if (totalPages < 1) return null


    // Build page numbers to show: always show first, last, current ±1, with ellipsis
    const pages: (number | 'ellipsis')[] = []
    const delta = 1 // pages around current

    const range = (start: number, end: number) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i)

    const left = Math.max(2, page - delta)
    const right = Math.min(totalPages - 1, page + delta)

    pages.push(1)
    if (left > 2) pages.push('ellipsis')
    range(left, right).forEach(p => pages.push(p))
    if (right < totalPages - 1) pages.push('ellipsis')
    if (totalPages > 1) pages.push(totalPages)

    return (
        <div className="border-t border-border-subtle p-4">
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={(e) => { e.preventDefault(); if (page > 1) onPageChange(page - 1) }}
                            className="border border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle hover:text-foreground rounded-md aria-disabled:opacity-40 aria-disabled:pointer-events-none"
                            aria-disabled={page <= 1}
                        />
                    </PaginationItem>

                    {pages.map((p, idx) =>
                        p === 'ellipsis' ? (
                            <PaginationItem key={`ellipsis-${idx}`}>
                                <PaginationEllipsis className="text-muted-foreground" />
                            </PaginationItem>
                        ) : (
                            <PaginationItem key={p}>
                                <PaginationLink
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); onPageChange(p) }}
                                    isActive={p === page}
                                    className={
                                        p === page
                                            ? "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                                            : "border border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle hover:text-foreground rounded-md"
                                    }
                                >
                                    {p}
                                </PaginationLink>
                            </PaginationItem>
                        )
                    )}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={(e) => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1) }}
                            className="border border-border-subtle bg-transparent text-foreground hover:bg-gold-subtle hover:text-foreground rounded-md aria-disabled:opacity-40 aria-disabled:pointer-events-none"
                            aria-disabled={page >= totalPages}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    )
}

export default PaginationV1