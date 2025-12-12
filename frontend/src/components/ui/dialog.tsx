import React, { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

type DialogContextValue = {
  onOpenChange?: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue>({})

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onOpenChange(false)}>
        <div
          className="relative w-full max-w-2xl rounded-lg border bg-background p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  )
}

export function DialogContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1', className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-semibold leading-none', className)}>{children}</h3>
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-end gap-2 pt-2', className)}>{children}</div>
}

export function DialogClose({ children, className }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(DialogContext)
  return (
    <button
      type="button"
      className={cn('rounded-md border px-3 py-2 text-sm hover:bg-muted', className)}
      onClick={() => ctx.onOpenChange?.(false)}
    >
      {children}
    </button>
  )
}
