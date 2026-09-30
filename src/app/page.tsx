'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Settings2, Upload } from 'lucide-react'
import type { Bookmark, Category } from '@/lib/types'
import { BookmarkRow } from '@/components/BookmarkRow'
import { BookmarkDialog } from '@/components/BookmarkDialog'
import { UploadDialog } from '@/components/UploadDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CategoryManager } from '@/components/CategoryManager'
import { Button } from '@/components/ui/Button'

type CategoryWithCount = Category & { count: number }

export default function Home() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState('')

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Bookmark | null>(null)
  const [deleting, setDeleting] = useState<Bookmark | null>(null)
  const [catManagerOpen, setCatManagerOpen] = useState(false)

  // 搜索 300ms 防抖
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const refresh = useCallback(async () => {
    const params = new URLSearchParams()
    if (debouncedQ) params.set('q', debouncedQ)
    if (category) params.set('category', category)
    const [bmRes, catRes] = await Promise.all([
      fetch(`/api/bookmarks?${params.toString()}`),
      fetch('/api/categories'),
    ])
    setBookmarks((await bmRes.json()).bookmarks ?? [])
    setCategories((await catRes.json()).categories ?? [])
  }, [debouncedQ, category])

  useEffect(() => {
    refresh()
  }, [refresh])

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of categories) map.set(c.id, c.name)
    return map
  }, [categories])

  const chips: Array<{ key: string; label: string; count?: number }> = [
    { key: '', label: '全部' },
    { key: 'uncategorized', label: '未分类' },
    ...categories.map((c) => ({ key: String(c.id), label: c.name, count: c.count })),
  ]

  const hasFilter = debouncedQ !== '' || category !== ''

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950">HTML List</h1>
        <p className="text-xs text-zinc-400">{bookmarks.length} 条书签</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标题、描述或 URL…"
            className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-950 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
          />
        </div>
        <Button variant="primary" onClick={() => setLinkDialogOpen(true)}>
          <Plus size={14} /> 添加链接
        </Button>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload size={14} /> 上传 HTML
        </Button>
        <Button size="icon" aria-label="分类管理" title="分类管理" onClick={() => setCatManagerOpen(true)}>
          <Settings2 size={15} />
        </Button>
      </div>

      <nav className="mb-5 flex flex-wrap items-center gap-1" aria-label="分类筛选">
        {chips.map((chip) => {
          const active = category === chip.key
          return (
            <button
              key={chip.key || 'all'}
              type="button"
              onClick={() => setCategory(chip.key)}
              className={`rounded-full px-2.5 py-1 text-[13px] transition-colors ${
                active
                  ? 'bg-zinc-950 font-medium text-white'
                  : 'text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900'
              }`}
            >
              {chip.label}
              {chip.count !== undefined && (
                <span className={`ml-1.5 text-xs ${active ? 'text-white/50' : 'text-zinc-400'}`}>
                  {chip.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {bookmarks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center text-sm text-zinc-500">
          {hasFilter ? (
            <p>
              没有匹配的书签，试试
              <button
                type="button"
                className="mx-1 text-zinc-950 underline underline-offset-4"
                onClick={() => {
                  setQ('')
                  setCategory('')
                }}
              >
                清空搜索和筛选
              </button>
            </p>
          ) : (
            <p>还没有书签，点击「添加链接」或「上传 HTML」开始收藏</p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {bookmarks.map((b) => (
            <li key={b.id}>
              <BookmarkRow
                bookmark={b}
                categoryName={b.category_id ? (categoryNameById.get(b.category_id) ?? null) : null}
                onEdit={(bm) => setEditing(bm)}
                onDelete={(bm) => setDeleting(bm)}
              />
            </li>
          ))}
        </ul>
      )}

      <BookmarkDialog
        key={editing ? `edit-${editing.id}` : 'new-link'}
        open={linkDialogOpen || !!editing}
        initial={editing}
        categories={categories}
        onClose={() => {
          setLinkDialogOpen(false)
          setEditing(null)
        }}
        onSaved={() => {
          setLinkDialogOpen(false)
          setEditing(null)
          refresh()
        }}
      />

      <UploadDialog
        open={uploadDialogOpen}
        categories={categories}
        onClose={() => setUploadDialogOpen(false)}
        onSaved={() => {
          setUploadDialogOpen(false)
          refresh()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        message={`确定删除「${deleting?.title ?? ''}」吗？${
          deleting?.type === 'file' ? '磁盘上的 HTML 文件也会一并删除。' : ''
        }`}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          await fetch(`/api/bookmarks/${deleting.id}`, { method: 'DELETE' })
          setDeleting(null)
          refresh()
        }}
      />

      <CategoryManager
        open={catManagerOpen}
        categories={categories}
        onClose={() => setCatManagerOpen(false)}
        onChanged={refresh}
      />
    </main>
  )
}
