import { LucideIcon } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface MetricCardProps {
  title: string
  value: string
  change?: {
    value: string
    trend: "up" | "down" | "neutral"
  }
  icon: LucideIcon
  iconColor?: string
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
}: MetricCardProps) {
  return (
    <div className="rounded-md border border-border-subtle bg-card p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                "text-xs font-medium",
                change.trend === "up" && "text-green-400",
                change.trend === "down" && "text-red-400",
                change.trend === "neutral" && "text-muted-foreground"
              )}
            >
              {change.trend === "up" && "↑ "}
              {change.trend === "down" && "↓ "}
              {change.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-md bg-gold-subtle",
            iconColor
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
