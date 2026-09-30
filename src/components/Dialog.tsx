'use client'

import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Radix 无头模态框：焦点圈禁、Esc/点遮罩关闭（叠加时只关最上层）、滚动锁定 */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="dialog-content fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl outline-none"
          aria-label={title}
        >
          <div className="mb-5 flex items-center justify-between">
            <DialogPrimitive.Title className="text-[15px] font-semibold tracking-tight text-zinc-950">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="关闭"
              className="rounded-md p-1.5 text-zinc-400 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X size={15} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
