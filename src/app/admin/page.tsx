'use client'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
} from "lucide-react"
import { AdminHeader } from "../../components/admin/admin-header"
import { MetricCard } from "../../components/admin/metric-card"
import { RevenueChart } from "../../components/admin/revenue-chart"
import { TopDishesChart } from "../../components/admin/top-dishes-chart"
import { useGetOrders } from "@/src/queries/useOrder"
import { useGetTables } from "@/src/queries/useTable"
import { useMemo } from "react"
import { cn, formatCurrency, formatTime } from "@/src/lib/utils"
import { OrderStatus, STATUS_LABELS, STATUS_STYLES } from "./orders/components/status_select"

export default function AdminDashboard() {
  const { data: ordersData, isLoading: ordersLoading } = useGetOrders({ page: 1, pageSize: 100 })
  const { data: tablesData, isLoading: tablesLoading } = useGetTables({ page: 1, pageSize: 5 })


  const orders = ordersData?.payload.data.data ?? []
  const tables = tablesData?.payload.data.data ?? []




  // ─── Aggregate stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const servedOrders = orders.filter((o) => o.status === "Served")
    const activeOrders = orders.filter(
      (o) => o.status !== "Cancelled" && o.status !== "Served"
    )
    const occupiedTables = tables.filter((t) => t.status === "Occupied")

    const revenue = servedOrders.reduce(
      (sum, o) => sum + (o.dishPrice ?? 0) * o.quantity,
      0
    )
    const avgOrderValue =
      servedOrders.length > 0
        ? Math.round(revenue / servedOrders.length)
        : 0

    return {
      revenue,
      totalOrders: orders.length,
      activeTables: occupiedTables.length,
      avgOrderValue,
      activeOrders: activeOrders.length,
    }
  }, [orders, tables])


  // ─── Recent orders (top 5, most recent first) ─────────────────────────────
  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [orders]
  )

  const isLoading = ordersLoading || tablesLoading
  return (
    <div className="min-h-screen">
      <AdminHeader
        title="Dashboard"
        subtitle="Welcome back, Admin"
      />

      <div className="space-y-6 p-6">
        {/* ── Metric Cards ───────────────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Doanh thu"
            value={isLoading ? "..." : formatCurrency(stats.revenue)}
            change={{ value: "Tổng đơn đã phục vụ", trend: "neutral" }}
            icon={DollarSign}
          />
          <MetricCard
            title="Tổng đơn hàng"
            value={isLoading ? "..." : String(stats.totalOrders)}
            change={{
              value: `${stats.activeOrders} đang xử lý`,
              trend: stats.activeOrders > 0 ? "up" : "neutral",
            }}
            icon={ShoppingCart}
          />
          <MetricCard
            title="Bàn đang có khách"
            value={isLoading ? "..." : String(stats.activeTables)}
            change={{
              value: `/ ${tables.length} bàn tổng`,
              trend: "neutral",
            }}
            icon={Users}
          />
          <MetricCard
            title="Giá trị TB / đơn"
            value={isLoading ? "..." : formatCurrency(stats.avgOrderValue)}
            change={{ value: "Trên đơn đã phục vụ", trend: "neutral" }}
            icon={TrendingUp}
          />
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart />
          <TopDishesChart />
        </div>

        {/* ── Recent Orders ──────────────────────────────────────────────── */}
        <div className="rounded-md border border-border-subtle bg-card p-6 shadow-card">
          <div className="mb-6">
            <h3 className="text-lg font-bold uppercase tracking-wide text-foreground">
              Đơn hàng gần đây
            </h3>
            <p className="text-xs text-muted-foreground">
              5 đơn mới nhất từ tất cả bàn
            </p>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Đang tải...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Chưa có đơn hàng nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {["Order ID", "Bàn", "Khách", "Món", "Tổng", "Trạng thái", "Giờ"].map(
                      (h) => (
                        <th
                          key={h}
                          className="pb-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-gold-subtle/30"
                    >
                      <td className="py-4 font-mono text-sm font-medium text-foreground">
                        #{String(order.id).padStart(3, "0")}
                      </td>
                      <td className="py-4 text-sm text-foreground">
                        Bàn {order.tableNumber}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {order.guestName}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {order.dishName ?? `Snapshot #${order.dishSnapshotId}`}
                        {order.quantity > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground/60">
                            ×{order.quantity}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-sm font-medium text-primary">
                        {order.dishPrice
                          ? formatCurrency(order.dishPrice * order.quantity)
                          : "—"}
                      </td>
                      <td className="py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider",
                            STATUS_STYLES[order.status as OrderStatus] ?? "bg-white/8 text-foreground"
                          )}
                        >
                          {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">
                        {formatTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

