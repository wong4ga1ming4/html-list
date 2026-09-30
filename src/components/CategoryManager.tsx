'use client'

import { useState } from 'react'
import type { Category } from '@/lib/types'
import { Dialog } from './Dialog'
import { ConfirmDialog } from './ConfirmDialog'

interface CategoryManagerProps {
  open: boolean
  categories: Array<Category & { count: number }>
  onClose: () => void
  onChanged: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

async function patchCategory(id: number, body: Record<string, unknown>) {
  const res = await fetch(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

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
        <div className="space-y-3">
          {categories.length === 0 && (
            <p className="text-sm text-gray-500">还没有分类，在下方输入名称添加。</p>
          )}
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
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
                      className="flex-1 rounded border border-blue-300 px-2 py-1 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameSubmit(c.id)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      确定
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(null)}
                      className="text-sm text-gray-400 hover:underline"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm text-gray-800">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.count} 条书签</span>
                    <div className="flex gap-0.5 text-gray-400">
                      <button
                        type="button"
                        aria-label={`上移 ${c.name}`}
                        title="上移"
                        disabled={i === 0}
                        className="rounded px-1 hover:bg-gray-200 disabled:opacity-30"
                        onClick={() => handleMove(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`下移 ${c.name}`}
                        title="下移"
                        disabled={i === categories.length - 1}
                        className="rounded px-1 hover:bg-gray-200 disabled:opacity-30"
                        onClick={() => handleMove(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`改名 ${c.name}`}
                        title="改名"
                        className="rounded px-1 hover:bg-gray-200"
                        onClick={() => {
                          setRenamingId(c.id)
                          setRenamingName(c.name)
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        aria-label={`删除 ${c.name}`}
                        title="删除"
                        className="rounded px-1 hover:bg-red-100 hover:text-red-600"
                        onClick={() => setDeleting(c)}
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAdd} className="flex gap-2 border-t border-gray-100 pt-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新分类名称"
              className={inputClass}
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              添加
            </button>
          </form>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
