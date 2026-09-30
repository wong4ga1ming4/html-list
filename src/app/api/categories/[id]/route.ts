import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { Category } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

function findCategory(id: number): Category | undefined {
  return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id) as
    | Category
    | undefined
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: raw } = await params
  const id = Number(raw)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: '分类不存在' }, { status: 404 })
  }
  const existing = findCategory(id)
  if (!existing) {
    return NextResponse.json({ error: '分类不存在' }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; sort_order?: unknown }
    | null
  const name =
    body?.name !== undefined ? String(body.name).trim() : existing.name
  if (!name) {
    return NextResponse.json({ error: '分类名不能为空' }, { status: 400 })
  }
  const sortOrder =
    body?.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order
  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: 'sort_order 无效' }, { status: 400 })
  }

  try {
    getDb()
      .prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?')
      .run(name, sortOrder, id)
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: '分类名已存在' }, { status: 409 })
    }
    throw err
  }
  return NextResponse.json({ category: findCategory(id) })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: raw } = await params
  const id = Number(raw)
  if (!Number.isInteger(id) || !findCategory(id)) {
    return NextResponse.json({ error: '分类不存在' }, { status: 404 })
  }
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
