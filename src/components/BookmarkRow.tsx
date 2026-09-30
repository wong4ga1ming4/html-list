'use client'

import { FileText, Link2, Pencil, Trash2 } from 'lucide-react'
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
  const Icon = bookmark.type === 'file' ? FileText : Link2
  return (
    <div className="group flex items-center gap-1 px-4 py-3 transition-colors hover:bg-zinc-50">
      <a
        href={href(bookmark)}
        target="_blank"
        rel="noopener"
        className="flex min-w-0 flex-1 items-center gap-3 py-0.5"
      >
        <Icon size={15} strokeWidth={1.75} className="shrink-0 text-zinc-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-900">{bookmark.title}</span>
            {categoryName && (
              <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-px text-[11px] text-zinc-500">
                {categoryName}
              </span>
            )}
          </div>
          {bookmark.description && (
            <p className="mt-0.5 truncate text-[13px] text-zinc-500">{bookmark.description}</p>
          )}
        </div>
        <span className="hidden shrink-0 font-mono text-xs text-zinc-400 sm:block">
          {sourceLabel(bookmark)}
        </span>
      </a>
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
        <button
          type="button"
          aria-label={`编辑 ${bookmark.title}`}
          title="编辑"
          className="rounded-md p-1.5 text-zinc-400 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          onClick={() => onEdit(bookmark)}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          aria-label={`删除 ${bookmark.title}`}
          title="删除"
          className="rounded-md p-1.5 text-zinc-400 outline-none transition-colors hover:bg-red-50 hover:text-red-600"
          onClick={() => onDelete(bookmark)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
