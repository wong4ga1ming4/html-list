'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import type { Category } from '@/lib/types'
import { Dialog } from './Dialog'
import { ConfirmDialog } from './ConfirmDialog'
import { Button } from './ui/Button'
import { Input } from './ui/Field'

interface CategoryManagerProps {
  open: boolean
  categories: Array<Category & { count: number }>
  onClose: () => void
  onChanged: () => void
}

async function patchCategory(id: number, body: Record<string, unknown>) {
  const res = await fetch(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

const rowAction =
  'rounded-md p-1 text-zinc-400 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-25'

export function CategoryManager({ open, categories, onClose, onChanged }: CategoryManagerProps) {
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renamingName, setRenamingName] = useState('')
  const [deleting, setDeleting] = useState<(Category & { count: number }) | null>(null)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? '添加失败')
      return
    }
    setNewName('')
    onChanged()
  }

  async function handleRenameSubmit(id: number) {
    if (!renamingName.trim()) return
    if (await patchCategory(id, { name: renamingName.trim() })) {
      setRenamingId(null)
      onChanged()
    }
  }

  /** 与相邻分类互换 sort_order（两次 PATCH） */
  async function handleMove(index: number, dir: -1 | 1) {
    const a = categories[index]
    const b = categories[index + dir]
    if (!a || !b) return
    await Promise.all([
      patchCategory(a.id, { sort_order: b.sort_order }),
      patchCategory(b.id, { sort_order: a.sort_order }),
    ])
    onChanged()
  }

  async function handleConfirmDelete() {
    if (!deleting) return
    await fetch(`/api/categories/${deleting.id}`, { method: 'DELETE' })
    setDeleting(null)
    onChanged()
  }

  return (
    <>
      <Dialog open={open} title="分类管理" onClose={onClose}>
        <div className="space-y-4">
          {categories.length === 0 && (
            <p className="text-sm text-zinc-500">还没有分类，在下方输入名称添加。</p>
          )}
          <ul className="max-h-72 space-y-0.5 overflow-y-auto">
            {categories.map((c, i) => (
              <li
                key={c.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-50"
              >
                {renamingId === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={renamingName}
                      onChange={(e) => setRenamingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(c.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      className="h-7 flex-1 rounded border border-zinc-400 px-2 text-sm text-zinc-950 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameSubmit(c.id)}
                      className="px-1 text-[13px] font-medium text-zinc-950 hover:underline"
                    >
                      确定
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="px-1 text-[13px] text-zinc-400 hover:text-zinc-700"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm text-zinc-800">{c.name}</span>
                    <span className="text-xs tabular-nums text-zinc-400">{c.count} 条书签</span>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        aria-label={`上移 ${c.name}`}
                        title="上移"
                        disabled={i === 0}
                        className={rowAction}
                        onClick={() => handleMove(i, -1)}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`下移 ${c.name}`}
                        title="下移"
                        disabled={i === categories.length - 1}
                        className={rowAction}
                        onClick={() => handleMove(i, 1)}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`改名 ${c.name}`}
                        title="改名"
                        className={rowAction}
                        onClick={() => {
                          setRenamingId(c.id)
                          setRenamingName(c.name)
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`删除 ${c.name}`}
                        title="删除"
                        className="rounded-md p-1 text-zinc-400 outline-none transition-colors hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="flex gap-2 border-t border-zinc-100 pt-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新分类名称"
            />
            <Button variant="primary" type="submit" className="shrink-0">
              添加
            </Button>
          </form>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        message={`确定删除分类「${deleting?.name ?? ''}」吗？其下 ${
          deleting?.count ?? 0
        } 条书签将归为「未分类」。`}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
