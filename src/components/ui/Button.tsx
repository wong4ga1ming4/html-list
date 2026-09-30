'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary: 'bg-zinc-950 text-white hover:bg-zinc-800',
  secondary: 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950',
  ghost: 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-3 text-[13px] font-medium',
  icon: 'h-8 w-8 rounded-md',
  'icon-sm': 'h-7 w-7 rounded-md',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'sm', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
})
