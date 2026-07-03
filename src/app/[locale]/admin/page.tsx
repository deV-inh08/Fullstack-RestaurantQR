'use client'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { AdminHeader } from "@/src/components/admin/admin-header"
import { MetricCard } from "@/src/components/admin/metric-card"
import { RevenueChart } from "@/src/components/admin/revenue-chart"
import { TopDishesChart } from "@/src/components/admin/top-dishes-chart"
import { useGetOrders } from "@/src/queries/useOrder"
import { useGetTables } from "@/src/queries/useTable"
import { useMemo } from "react"
import { cn, formatCurrency, formatTime } from "@/src/lib/utils"
import { OrderStatus, STATUS_STYLES, useOrderStatusLabels } from "./orders/components/status_select"

export default function AdminDashboard() {
  const t = useTranslations("Admin.Dashboard")
  const statusLabels = useOrderStatusLabels()
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
        title={t("header.title")}
        subtitle={t("header.subtitle")}
      />

      <div className="space-y-6 p-6">
        {/* ── Metric Cards ───────────────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={t("metrics.revenue")}
            value={isLoading ? "..." : formatCurrency(stats.revenue)}
            change={{ value: t("metrics.revenueChange"), trend: "neutral" }}
            icon={DollarSign}
          />
          <MetricCard
            title={t("metrics.totalOrders")}
            value={isLoading ? "..." : String(stats.totalOrders)}
            change={{
              value: t("metrics.totalOrdersProcessing", { count: stats.activeOrders }),
              trend: stats.activeOrders > 0 ? "up" : "neutral",
            }}
            icon={ShoppingCart}
          />
          <MetricCard
            title={t("metrics.activeTables")}
            value={isLoading ? "..." : String(stats.activeTables)}
            change={{
              value: t("metrics.activeTablesOf", { total: tables.length }),
              trend: "neutral",
            }}
            icon={Users}
          />
          <MetricCard
            title={t("metrics.avgOrderValue")}
            value={isLoading ? "..." : formatCurrency(stats.avgOrderValue)}
            change={{ value: t("metrics.avgOrderValueChange"), trend: "neutral" }}
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
              {t("recentOrders.title")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("recentOrders.subtitle")}
            </p>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("recentOrders.loading")}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("recentOrders.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {[
                      t("recentOrders.columns.orderId"),
                      t("recentOrders.columns.table"),
                      t("recentOrders.columns.guest"),
                      t("recentOrders.columns.dish"),
                      t("recentOrders.columns.total"),
                      t("recentOrders.columns.status"),
                      t("recentOrders.columns.time"),
                    ].map(
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
                        {t("recentOrders.columns.table")} {order.tableNumber}
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
                          {statusLabels[order.status as OrderStatus] ?? order.status}
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

