'use client'

import { useState } from 'react'
import type { Category } from '@/lib/types'
import { extractTitle } from '@/lib/title'
import { Dialog } from './Dialog'

interface UploadDialogProps {
  open: boolean
  categories: Array<Category & { count: number }>
  onClose: () => void
  onSaved: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

export function UploadDialog({ open, categories, onClose, onSaved }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError('')
    if (!f) return
    // 读取内容，用 <title> 预填标题（可改）
    const reader = new FileReader()
    reader.onload = () => {
      const fallback = f.name.replace(/\.html?$/i, '')
      setTitle(extractTitle(String(reader.result ?? ''), fallback))
    }
    reader.readAsText(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('请选择 .html 文件')
      return
    }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (title.trim()) fd.append('title', title)
      if (description.trim()) fd.append('description', description)
      if (categoryId) fd.append('category_id', categoryId)
      const res = await fetch('/api/bookmarks/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? '上传失败，请重试')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} title="上传 HTML" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">文件 *（自包含 .html）</span>
          <input
            required
            type="file"
            accept=".html"
            onChange={handleFileChange}
            className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-200"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">标题</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="选文件后自动提取，可修改"
          />
        </label>
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
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {saving ? '上传中…' : '上传'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
