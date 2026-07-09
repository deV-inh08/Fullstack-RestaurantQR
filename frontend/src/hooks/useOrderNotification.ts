/**
 * useOrderNotification.ts
 *
 * Quản lý notification badge + danh sách order mới cho Staff.
 * Dùng Zustand để share state giữa Sidebar và OrderPage.
 * 
 * Dự án đang dùng zustand rồi (thấy trong app-provider.tsx)
 */

import { create } from 'zustand'
import type { OrderDto } from '@/src/schema/order.schema'

// ─── Store ───────────────────────────────────────────────────────────────────

interface OrderNotificationState {
    // Số lượng order mới chưa xem (hiển thị trên badge sidebar)
    unreadCount: number

    // Danh sách thông báo gần nhất (tối đa 10)
    notifications: OrderNotification[]

    // Actions
    addOrderCreated: (order: OrderDto) => void
    addOrderStatusUpdated: (order: OrderDto) => void
    markAllAsRead: () => void
    clearNotifications: () => void
}

export interface OrderNotification {
    id: string
    type: 'new_order' | 'status_updated'
    order: OrderDto
    timestamp: Date
    read: boolean
}

export const useOrderNotificationStore = create<OrderNotificationState>((set) => ({
    unreadCount: 0,
    notifications: [],

    addOrderCreated: (order) => {
        const notification: OrderNotification = {
            id: `${Date.now()}-${order.id}`,
            type: 'new_order',
            order,
            timestamp: new Date(),
            read: false,
        }
        set((state) => ({
            unreadCount: state.unreadCount + 1,
            notifications: [notification, ...state.notifications].slice(0, 10), // giữ 10 cái gần nhất
        }))
    },

    addOrderStatusUpdated: (order) => {
        const notification: OrderNotification = {
            id: `${Date.now()}-${order.id}-status`,
            type: 'status_updated',
            order,
            timestamp: new Date(),
            read: false,
        }
        set((state) => ({
            unreadCount: state.unreadCount + 1,
            notifications: [notification, ...state.notifications].slice(0, 10),
        }))
    },

    markAllAsRead: () => {
        set((state) => ({
            unreadCount: 0,
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
    },

    clearNotifications: () => {
        set({ unreadCount: 0, notifications: [] })
    },
}))