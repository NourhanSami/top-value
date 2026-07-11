import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { IconBox } from "./IconBox"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  variant?: "primary" | "success" | "warning" | "info" | "destructive"
  change?: {
    value: number
    label: string
  }
  subtitle?: string
  className?: string
}

export function StatCard({
  title,
  value,
  icon,
  variant = "primary",
  change,
  subtitle,
  className,
}: StatCardProps) {
  const isPositiveChange = change && change.value >= 0

  return (
    <div className={cn("flat-card hover-lift p-6", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium mb-1">
            {title}
          </p>
        </div>
        <IconBox icon={icon} variant={variant} size="md" iconSize={20} />
      </div>

      <div className="space-y-2">
        <p className="text-3xl font-bold text-foreground">{value}</p>

        {change && (
          <div className="flex items-center gap-1 text-sm">
            {isPositiveChange ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span
              className={cn(
                "font-medium",
                isPositiveChange ? "text-success" : "text-destructive"
              )}
            >
              {Math.abs(change.value)}%
            </span>
            <span className="text-muted-foreground">{change.label}</span>
          </div>
        )}

        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
