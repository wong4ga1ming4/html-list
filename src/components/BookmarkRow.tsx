'use client'

import type { Bookmark } from '@/lib/types'

interface BookmarkRowProps {
  bookmark: Bookmark
  categoryName: string | null
  onEdit: (b: Bookmark) => void
  onDelete: (b: Bookmark) => void
}

function href(b: Bookmark): string {
  return b.type === 'file' ? `/p/${b.slug}` : (b.url ?? '#')
}

function sourceLabel(b: Bookmark): string {
  if (b.type === 'file') return `/p/${b.slug}`
  try {
    return new URL(b.url ?? '').hostname
  } catch {
    return b.url ?? ''
  }
}

export function BookmarkRow({ bookmark, categoryName, onEdit, onDelete }: BookmarkRowProps) {
  return (
    <div className="group flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
      <a
        href={href(bookmark)}
        target="_blank"
        rel="noopener"
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="shrink-0 text-xl" aria-hidden>
          {bookmark.type === 'file' ? '📄' : '🔗'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-gray-900">{bookmark.title}</span>
            {categoryName && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {categoryName}
              </span>
            )}
          </div>
          {bookmark.description && (
            <p className="truncate text-sm text-gray-500">{bookmark.description}</p>
          )}
        </div>
        <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
          {sourceLabel(bookmark)}
        </span>
      </a>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          aria-label={`编辑 ${bookmark.title}`}
          title="编辑"
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={() => onEdit(bookmark)}
        >
          ✏️
        </button>
        <button
          type="button"
          aria-label={`删除 ${bookmark.title}`}
          title="删除"
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          onClick={() => onDelete(bookmark)}
        >
          🗑
        </button>
      </div>
    </div>
  )
}
