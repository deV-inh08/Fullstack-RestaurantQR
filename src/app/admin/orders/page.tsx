"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useGetOrders } from "@/src/queries/useOrder"
import { useOrderSignalR } from "@/src/hooks/useOrderSignalR"
import TableStatusGrid from "./components/TableStatusGrid"
import { formatCurrency } from "@/src/lib/utils"
import type { OrderDto } from "@/src/schema/order.schema"

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const { data, isLoading } = useGetOrders({ page, pageSize: 20 })

  // Trang này đã được middleware bảo vệ (chỉ staff/admin vào được) nên
  // không cần kiểm tra lại role — không còn getAccessTokenFromLocalStorage()
  // nữa, token thật do hook tự lấy qua /api/realtime-token.
  useOrderSignalR({
    role: 'staff',
    enabled: true,
    onOrderCreated: (order: OrderDto) => {
      toast.success(`Order mới — Bàn ${order.tableNumber}`)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onOrderStatusUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const orders = data?.payload.data.data ?? []

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-bold">Quản lý Orders</h1>
      <TableStatusGrid />
      <div className="rounded-xl border border-foreground/10">
        <table className="w-full text-sm">
          <thead className="border-b border-foreground/10 text-left text-foreground/60">
            <tr>
              <th className="p-3">Bàn</th>
              <th className="p-3">Món</th>
              <th className="p-3">SL</th>
              <th className="p-3">Tiền</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && orders.map((order: OrderDto) => (
              <tr key={order.id} className="border-b border-foreground/5">
                <td className="p-3">{order.tableNumber}</td>
                <td className="p-3">{order.dishName}</td>
                <td className="p-3">{order.quantity}</td>
                <td className="p-3">{formatCurrency(order.dishPrice * order.quantity)}</td>
                <td className="p-3">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
