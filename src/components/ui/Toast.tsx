'use client'

import { cn } from '@/lib/utils'

interface ToastProps {
  message: string
  icon?: string
  visible: boolean
}

export function Toast({ message, icon = '✓', visible }: ToastProps) {
  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 z-50 flex items-center gap-2',
        'bg-brand-900 text-white text-sm font-medium',
        'px-5 py-3 rounded-full shadow-lg pointer-events-none whitespace-nowrap',
        'transition-all duration-300',
        visible
          ? 'opacity-100 -translate-x-1/2 translate-y-0 toast-animate'
          : 'opacity-0 -translate-x-1/2 translate-y-4'
      )}
      role="status"
      aria-live="polite"
    >
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  )
}
