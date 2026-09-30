import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { Category } from '@/lib/types'

type CategoryWithCount = Category & { count: number }

export async function GET() {
  const rows = getDb()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM bookmarks WHERE category_id = c.id) AS count
       FROM categories c ORDER BY c.sort_order, c.id`
    )
    .all() as CategoryWithCount[]
  return NextResponse.json({ categories: rows })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: '分类名不能为空' }, { status: 400 })
  }
  try {
    const info = getDb().prepare('INSERT INTO categories (name) VALUES (?)').run(name)
    const category = getDb()
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(info.lastInsertRowid) as Category
    return NextResponse.json({ category }, { status: 201 })
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: '分类名已存在' }, { status: 409 })
    }
    throw err
  }
}
