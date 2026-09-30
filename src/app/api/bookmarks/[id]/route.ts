import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { Bookmark } from '@/lib/types'

const COLUMNS = 'id, type, title, description, url, slug, category_id, created_at, updated_at'

type Params = { params: Promise<{ id: string }> }

function findBookmark(id: number): Bookmark | undefined {
  return getDb().prepare(`SELECT ${COLUMNS} FROM bookmarks WHERE id = ?`).get(id) as
    | Bookmark
    | undefined
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: raw } = await params
  const id = Number(raw)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: '书签不存在' }, { status: 404 })
  }
  const existing = findBookmark(id)
  if (!existing) {
    return NextResponse.json({ error: '书签不存在' }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; description?: unknown; category_id?: unknown }
    | null

  const title = body?.title !== undefined ? String(body.title).trim() : existing.title
  if (!title) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  const description =
    body?.description !== undefined ? String(body.description).trim() : existing.description

  let categoryId: number | null
  if (body?.category_id === undefined) {
    categoryId = existing.category_id
  } else if (body.category_id === null) {
    categoryId = null
  } else {
    categoryId = Number(body.category_id)
    const exists = Number.isInteger(categoryId)
      ? getDb().prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)
      : undefined
    if (!exists) {
      return NextResponse.json({ error: '分类不存在' }, { status: 400 })
    }
  }

  getDb()
    .prepare(
      `UPDATE bookmarks SET title = ?, description = ?, category_id = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`
    )
    .run(title, description, categoryId, id)
  return NextResponse.json({ bookmark: findBookmark(id) })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: raw } = await params
  const id = Number(raw)
  if (!Number.isInteger(id) || !findBookmark(id)) {
    return NextResponse.json({ error: '书签不存在' }, { status: 404 })
  }
  getDb().prepare('DELETE FROM bookmarks WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
