'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Bookmark, Category } from '@/lib/types'
import { BookmarkRow } from '@/components/BookmarkRow'

type CategoryWithCount = Category & { count: number }

export default function Home() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState('')

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

  const chips: Array<{ key: string; label: string }> = [
    { key: '', label: '全部' },
    { key: 'uncategorized', label: '未分类' },
    ...categories.map((c) => ({ key: String(c.id), label: c.name })),
  ]

  const hasFilter = debouncedQ !== '' || category !== ''

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">📚 HTML List</h1>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索标题、描述或 URL…"
          className="min-w-40 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="button"
          disabled
          title="即将支持"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white opacity-50"
        >
          + 添加链接
        </button>
        <button
          type="button"
          disabled
          title="即将支持"
          className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-white opacity-50"
        >
          ⬆ 上传 HTML
        </button>
        <button
          type="button"
          disabled
          title="即将支持"
          aria-label="分类管理"
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm opacity-50"
        >
          ⚙
        </button>
      </header>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="分类筛选">
        {chips.map((chip) => (
          <button
            key={chip.key || 'all'}
            type="button"
            onClick={() => setCategory(chip.key)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              category === chip.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </nav>

      {bookmarks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-gray-500">
          {hasFilter ? (
            <p>
              没有匹配的书签，试试
              <button
                type="button"
                className="mx-1 text-blue-600 underline"
                onClick={() => {
                  setQ('')
                  setCategory('')
                }}
              >
                清空搜索和筛选
              </button>
            </p>
          ) : (
            <p>还没有书签，点击右上角「+ 添加链接」或「⬆ 上传 HTML」开始收藏</p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {bookmarks.map((b) => (
            <li key={b.id}>
              <BookmarkRow
                bookmark={b}
                categoryName={b.category_id ? (categoryNameById.get(b.category_id) ?? null) : null}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
