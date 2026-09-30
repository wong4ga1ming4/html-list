'use client'

import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  open: boolean
  message: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, message, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog open={open} title="确认操作" onClose={onClose}>
      <p className="mb-4 text-sm text-gray-700">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          删除
        </button>
      </div>
    </Dialog>
  )
}
