import { cn } from "@/lib/utils"

/**
 * Skeleton placeholder for loading states.
 * Shows animated placeholder while content is being fetched.
 *
 * @param className - Additional CSS classes to apply
 * @param props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * <Skeleton className="h-8 w-3/4" />
 * ```
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
