import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-primary/10 text-primary border-transparent',
  secondary: 'bg-secondary text-secondary-foreground border-transparent',
  outline: 'bg-transparent border-border',
  success: 'bg-emerald-100 text-emerald-800 border-transparent',
  warning: 'bg-amber-100 text-amber-800 border-transparent',
  destructive: 'bg-destructive/10 text-destructive border-transparent',
}

type BadgeVariant = keyof typeof variants

export function Badge({
  className,
  variant = 'default',
  children,
}: {
  className?: string
  variant?: BadgeVariant
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
