'use client'

import { useState } from 'react'
import type { Bookmark, Category } from '@/lib/types'
import { Dialog } from './Dialog'

interface BookmarkDialogProps {
  open: boolean
  /** 编辑的书签；null = 新建外链 */
  initial?: Bookmark | null
  categories: Array<Category & { count: number }>
  onClose: () => void
  onSaved: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

export function BookmarkDialog({
  open,
  initial = null,
  categories,
  onClose,
  onSaved,
}: BookmarkDialogProps) {
  const isEdit = !!initial
  const showUrl = !isEdit || initial!.type === 'link'

  const [title, setTitle] = useState(initial?.title ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(
    initial?.category_id != null ? String(initial.category_id) : ''
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = isEdit
        ? await fetch(`/api/bookmarks/${initial!.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              title,
              ...(showUrl ? { url } : {}),
              description,
              category_id: categoryId ? Number(categoryId) : null,
            }),
          })
        : await fetch('/api/bookmarks', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              title,
              url,
              description,
              category_id: categoryId ? Number(categoryId) : null,
            }),
          })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? '保存失败，请重试')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} title={isEdit ? '编辑书签' : '添加链接'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">标题 *</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="书签标题"
          />
        </label>
        {showUrl && (
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">URL *</span>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
              placeholder="https://example.com/page.html"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">描述</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="可选"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">分类</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">未分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
