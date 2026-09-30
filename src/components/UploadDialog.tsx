'use client'

import { useState } from 'react'
import { FileUp } from 'lucide-react'
import type { Category } from '@/lib/types'
import { extractTitle } from '@/lib/title'
import { BASE_PATH } from '@/lib/base-path'
import { Dialog } from './Dialog'
import { Button } from './ui/Button'
import { Input, Label, Select } from './ui/Field'

interface UploadDialogProps {
  open: boolean
  categories: Array<Category & { count: number }>
  onClose: () => void
  onSaved: () => void
}

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
      const res = await fetch(`${BASE_PATH}/api/bookmarks/upload`, { method: 'POST', body: fd })
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="block">
          <Label>文件 *（自包含 .html）</Label>
          <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700">
            <FileUp size={15} />
            {file ? (
              <span className="max-w-[240px] truncate font-mono text-[13px] text-zinc-900">
                {file.name}
              </span>
            ) : (
              '点击选择文件'
            )}
            <input required type="file" accept=".html" onChange={handleFileChange} className="sr-only" />
          </label>
        </div>
        <label className="block">
          <Label>标题</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="选文件后自动提取，可修改"
          />
        </label>
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
            {saving ? '上传中…' : '上传'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
