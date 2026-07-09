import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import envConfig from '@/src/config'
import type { OrderDto } from '@/src/schema/order.schema'
import type { BillDto } from '@/src/schema/bill.schema'
import type { TableDto } from '@/src/schema/table.schema'

type CommonOptions = {
    enabled: boolean
    onOrderCreated?: (order: OrderDto) => void
    onOrderStatusUpdated?: (order: OrderDto) => void
    onBillRequested?: (bill: BillDto) => void
    onBillPaid?: (bill: BillDto) => void
}

type StaffOptions = CommonOptions & {
    role: 'staff'
    onTableStatusChanged?: (table: TableDto) => void
}

type GuestOptions = CommonOptions & {
    role: 'guest'
    tableNumber: number
}

type Options = StaffOptions | GuestOptions

/**
 * accessTokenFactory tự fetch token từ BFF (/api/realtime-token hoặc
 * /api/guest/realtime-token) ngay trước mỗi lần connect/reconnect.
 * Token KHÔNG còn được truyền vào từ ngoài, KHÔNG còn đọc từ
 * localStorage/sessionStorage, và không được giữ lại ở đâu khác ngoài
 * bộ nhớ tạm của chính SignalR client trong lúc kết nối — đây là ngoại lệ
 * BFF duy nhất bắt buộc phải có vì WebSocket cần token ngay tại browser.
 */
export function useOrderSignalR(options: Options) {
    const connectionRef = useRef<signalR.HubConnection | null>(null)

    const onOrderCreatedRef = useRef(options.onOrderCreated)
    const onOrderStatusUpdatedRef = useRef(options.onOrderStatusUpdated)
    const onBillRequestedRef = useRef(options.onBillRequested)
    const onBillPaidRef = useRef(options.onBillPaid)
    const onTableStatusChangedRef = useRef(
        options.role === 'staff' ? options.onTableStatusChanged : undefined
    )
    onOrderCreatedRef.current = options.onOrderCreated
    onOrderStatusUpdatedRef.current = options.onOrderStatusUpdated
    onBillRequestedRef.current = options.onBillRequested
    onBillPaidRef.current = options.onBillPaid
    onTableStatusChangedRef.current = options.role === 'staff' ? options.onTableStatusChanged : undefined

    const tableNumber = options.role === 'guest' ? options.tableNumber : undefined

    useEffect(() => {
        if (!options.enabled) return

        const hubUrl = `${envConfig.NEXT_PUBLIC_SIGNALR_ORDER}/hubs/order`
        const tokenEndpoint = options.role === 'staff' ? '/api/realtime-token' : '/api/guest/realtime-token'

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: async () => {
                    try {
                        const res = await fetch(tokenEndpoint)
                        if (!res.ok) return ''
                        const data = await res.json()
                        return data.accessToken ?? ''
                    } catch {
                        return ''
                    }
                },
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(
                process.env.NODE_ENV === 'development'
                    ? signalR.LogLevel.Information
                    : signalR.LogLevel.Warning
            )
            .build()

        connection.on('OrderCreated', (order: OrderDto) => onOrderCreatedRef.current?.(order))
        connection.on('OrderStatusUpdated', (order: OrderDto) => onOrderStatusUpdatedRef.current?.(order))
        connection.on('TableStatusChanged', (table: TableDto) => onTableStatusChangedRef.current?.(table))
        connection.on('BillRequested', (bill: BillDto) => onBillRequestedRef.current?.(bill))
        connection.on('BillPaid', (bill: BillDto) => onBillPaidRef.current?.(bill))

        const join = async () => {
            try {
                if (options.role === 'staff') {
                    await connection.invoke('JoinStaffGroup')
                } else {
                    await connection.invoke('JoinTableGroup', options.tableNumber)
                }
            } catch (err) {
                console.error('[SignalR] Failed to join group:', err)
            }
        }

        connection.onreconnected(() => { join() })
        connection.start().then(join).catch((err) => {
            console.error('[SignalR] Connection failed:', err)
        })

        connectionRef.current = connection

        return () => {
            connection.stop()
            connectionRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.enabled, options.role, tableNumber])

    return connectionRef
}
