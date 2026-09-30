'use client'

import { Dialog } from './Dialog'
import { Button } from './ui/Button'

interface ConfirmDialogProps {
  open: boolean
  message: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, message, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog open={open} title="确认操作" onClose={onClose}>
      <p className="mb-5 text-sm leading-relaxed text-zinc-600">{message}</p>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>取消</Button>
        <Button variant="destructive" onClick={onConfirm}>
          删除
        </Button>
      </div>
    </Dialog>
  )
}
