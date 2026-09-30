'use client'

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const base =
  'h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, className)} {...props} />
  }
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(base, 'appearance-none pr-8', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
      </div>
    )
  }
)

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">{children}</span>
}
