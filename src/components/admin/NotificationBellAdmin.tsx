'use client'

/**
 * NotificationBell.tsx
 *
 * Thay thế Bell button hiện tại trong admin-header.tsx
 * Hiển thị badge số order chưa đọc + dropdown danh sách thông báo.
 */

import { Bell } from 'lucide-react'
import { Button } from '@/src/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/src/components/ui/popover'
import { cn, formatCurrency } from '@/src/lib/utils'
import { useOrderNotificationStore, type OrderNotification } from '@/src/hooks/useOrderNotification'

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
    Pending: 'Chờ xử lý',
    Preparing: 'Đang nấu',
    Served: 'Đã phục vụ',
    Cancelled: 'Đã hủy',
}

// ─── Component ───────────────────────────────────────────────────────────────
export function NotificationBell() {
    const { unreadCount, notifications, markAllAsRead } = useOrderNotificationStore()

    return (
        <Popover onOpenChange={(open) => { if (open) markAllAsRead() }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative rounded-md border-border-subtle hover:bg-gold-subtle hover:text-foreground"
                >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-80 p-0 border-border-subtle bg-card shadow-modal"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                        Thông báo
                    </h3>
                    {notifications.length > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            Đánh dấu đã đọc
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Bell className="h-8 w-8 opacity-20 mb-2" />
                            <p className="text-sm">Không có thông báo</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <NotificationItem key={n.id} notification={n} />
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ─── Notification Item ───────────────────────────────────────────────────────
function NotificationItem({ notification: n }: { notification: OrderNotification }) {
    const isNew = n.type === 'new_order'

    return (
        <div
            className={cn(
                'flex gap-3 border-b border-border-subtle px-4 py-3 transition-colors',
                'hover:bg-gold-subtle/30 cursor-pointer',
                !n.read && 'bg-gold-subtle/20'
            )}
        >
            {/* Icon */}
            <div className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm',
                isNew ? 'bg-primary/20 text-primary' : 'bg-white/8 text-muted-foreground'
            )}>
                {isNew ? '🆕' : '🔄'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">
                    {isNew
                        ? `Order mới — Bàn ${n.order.tableNumber}`
                        : `Cập nhật — Bàn ${n.order.tableNumber}`}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {n.order.dishName} x{n.order.quantity}
                    {' · '}
                    {formatCurrency(n.order.dishPrice * n.order.quantity)}
                </p>
                {!isNew && (
                    <span className={cn(
                        'inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        n.order.status === 'Served' && 'bg-green-500/20 text-green-400',
                        n.order.status === 'Preparing' && 'bg-primary/20 text-primary',
                        n.order.status === 'Cancelled' && 'bg-destructive/20 text-destructive',
                        n.order.status === 'Pending' && 'bg-white/8 text-muted-foreground',
                    )}>
                        {STATUS_LABEL[n.order.status] ?? n.order.status}
                    </span>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatRelativeTime(n.timestamp)}
                </p>
            </div>

            {/* Unread dot */}
            {!n.read && (
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            )}
        </div>
    )
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function formatRelativeTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return 'Vừa xong'
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    return `${Math.floor(diff / 3600)} giờ trước`
}