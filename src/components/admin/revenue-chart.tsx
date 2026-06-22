"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

import {
  ChartContainer, ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart"
import { useGetOrders } from "@/src/queries/useOrder"
import { useMemo } from "react"

const chartData = [
  { month: "Jan", revenue: 18500 },
  { month: "Feb", revenue: 22300 },
  { month: "Mar", revenue: 19800 },
  { month: "Apr", revenue: 25600 },
  { month: "May", revenue: 28900 },
  { month: "Jun", revenue: 32100 },
  { month: "Jul", revenue: 29500 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#FFC000",
  },
} satisfies ChartConfig

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function RevenueChart() {
  const { data: ordersData } = useGetOrders({
    page: 1,
    pageSize: 100
  });

  // const chartData = useMemo(() => {
  //   const orders = ordersData?.payload.data.data ?? []

  //   // Aggregate revenue by month for the current year
  //   const currentYear = new Date().getFullYear()
  //   const monthlyRevenue: Record<number, number> = {}

  //   for (const order of orders) {
  //     if (order.status !== "Served") continue
  //     const date = new Date(order.createdAt)
  //     if (date.getFullYear() !== currentYear) continue
  //     const month = date.getMonth() // 0-indexed
  //     monthlyRevenue[month] = (monthlyRevenue[month] ?? 0) + (order.dishPrice ?? 0) * order.quantity
  //   }

  //   // Build array for all 12 months (only up to current month)
  //   const currentMonth = new Date().getMonth()
  //   return Array.from({ length: currentMonth + 1 }, (_, i) => ({
  //     month: MONTH_LABELS[i],
  //     revenue: monthlyRevenue[i] ?? 0,
  //   }))
  // }, [ordersData])

  return (
    <div className="border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">
          Revenue Overview
        </h3>
        <p className="text-sm text-muted-foreground">
          Monthly revenue for the current year
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255, 255, 255, 0.1)"
          />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#ccc", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#ccc", fontSize: 12 }}
            tickFormatter={(value) =>
              value >= 1_000_000
                ? `${(value / 1_000_000).toFixed(1)}M`
                : value >= 1_000
                  ? `${(value / 1_000).toFixed(0)}k`
                  : String(value)
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
              />
            }
          />
          <Bar
            dataKey="revenue"
            fill="#FFC000"
            radius={0}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
