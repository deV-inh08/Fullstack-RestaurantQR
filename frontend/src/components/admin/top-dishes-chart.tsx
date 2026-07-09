"use client"

import { useTranslations } from "next-intl"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import {
  ChartContainer, ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart"
import { useGetOrders } from "@/src/queries/useOrder"
import { useMemo } from "react"

const chartData = [
  { name: "Phở Bò", orders: 245 },
  { name: "Bánh Mì", orders: 198 },
  { name: "Bún Chả", orders: 176 },
  { name: "Gỏi Cuốn", orders: 152 },
  { name: "Cơm Tấm", orders: 134 },
]

const chartConfig = {
  orders: {
    label: "Orders",
    color: "#FFC000",
  },
} satisfies ChartConfig

export function TopDishesChart() {
  const t = useTranslations("Admin.Dashboard.charts")
  const { data: ordersData, isLoading } = useGetOrders({
    page: 1,
    pageSize: 100
  });

  // const chartData = useMemo(() => {
  //   const orders = ordersData?.payload.data.data ?? []

  //   // Count quantity per dish (exclude cancelled)
  //   const dishCount: Record<string, { name: string; orders: number }> = {}
  //   for (const order of orders) {
  //     if (order.status === "Cancelled") continue
  //     const name = order.dishName ?? `Snapshot #${order.dishSnapshotId}`
  //     if (!dishCount[name]) {
  //       dishCount[name] = { name, orders: 0 }
  //     }
  //     dishCount[name].orders += order.quantity
  //   }

  //   return Object.values(dishCount)
  //     .sort((a, b) => b.orders - a.orders)
  //     .slice(0, 5)
  // }, [ordersData])
  return (
    <div className="border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">
          {t("topDishesTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("topDishesSubtitle")}
        </p>
      </div>
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#7D7D7D", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#FFFFFF", fontSize: 11 }}
              width={90}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${value} phần`, "Số lượng"]}
                />
              }
            />
            <Bar dataKey="orders" fill="#FFC000" radius={0} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}
