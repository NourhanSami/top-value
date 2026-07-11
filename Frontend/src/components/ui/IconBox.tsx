import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

const iconBoxVariants = cva(
  "flex items-center justify-center rounded-xl transition-all duration-200",
  {
    variants: {
      variant: {
        primary: "bg-accent text-primary",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-warning",
        info: "bg-info-light text-info",
        destructive: "bg-destructive/10 text-destructive",
      },
      size: {
        sm: "p-2 rounded-lg",
        md: "p-3 rounded-xl",
        lg: "p-4 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface IconBoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconBoxVariants> {
  icon: LucideIcon
  iconSize?: number
}

export function IconBox({
  icon: Icon,
  variant,
  size,
  iconSize = 24,
  className,
  ...props
}: IconBoxProps) {
  return (
    <div
      className={cn(iconBoxVariants({ variant, size, className }))}
      {...props}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </div>
  )
}
