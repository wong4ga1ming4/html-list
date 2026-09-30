'use client'

import { useState } from 'react'
import type { Bookmark, Category } from '@/lib/types'
import { Dialog } from './Dialog'
import { Button } from './ui/Button'
import { Input, Label, Select } from './ui/Field'

interface BookmarkDialogProps {
  open: boolean
  /** 编辑的书签；null = 新建外链 */
  initial?: Bookmark | null
  categories: Array<Category & { count: number }>
  onClose: () => void
  onSaved: () => void
}

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <Label>标题 *</Label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="书签标题"
          />
        </label>
        {showUrl && (
          <label className="block">
            <Label>URL *</Label>
            <Input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page.html"
              className="font-mono text-[13px]"
            />
          </label>
        )}
        <label className="block">
          <Label>描述</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="可选"
          />
        </label>
        <label className="block">
          <Label>分类</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">未分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
