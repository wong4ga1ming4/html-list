import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { Bookmark } from '@/lib/types'

/** 对外暴露的列（不含内部字段 file_name） */
const COLUMNS = 'id, type, title, description, url, slug, category_id, created_at, updated_at'

/** LIKE 通配符转义：% _ \ 按字面匹配 */
function escapeLike(q: string): string {
  return `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = sp.get('q')?.trim() ?? ''
  const category = sp.get('category') ?? ''

  const where: string[] = []
  const args: unknown[] = []

  if (q) {
    const like = escapeLike(q)
    where.push(
      `(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\')`
    )
    args.push(like, like, like)
  }
  if (category === 'uncategorized') {
    where.push('category_id IS NULL')
  } else if (/^\d+$/.test(category)) {
    where.push('category_id = ?')
    args.push(Number(category))
  }

  const sql = `SELECT ${COLUMNS} FROM bookmarks${
    where.length ? ' WHERE ' + where.join(' AND ') : ''
  } ORDER BY created_at DESC, id DESC`
  const bookmarks = getDb().prepare(sql).all(...args) as Bookmark[]
  return NextResponse.json({ bookmarks })
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; url?: unknown; description?: unknown; category_id?: unknown }
    | null

  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'URL 必须以 http:// 或 https:// 开头' }, { status: 400 })
  }
  const description = typeof body?.description === 'string' ? body.description.trim() : ''

  let categoryId: number | null = null
  if (body?.category_id !== undefined && body?.category_id !== null) {
    categoryId = Number(body.category_id)
    const exists = Number.isInteger(categoryId)
      ? getDb().prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)
      : undefined
    if (!exists) {
      return NextResponse.json({ error: '分类不存在' }, { status: 400 })
    }
  }

  const info = getDb()
    .prepare(
      "INSERT INTO bookmarks (type, title, description, url, category_id) VALUES ('link', ?, ?, ?, ?)"
    )
    .run(title, description, url, categoryId)
  const bookmark = getDb()
    .prepare(`SELECT ${COLUMNS} FROM bookmarks WHERE id = ?`)
    .get(info.lastInsertRowid) as Bookmark
  return NextResponse.json({ bookmark }, { status: 201 })
}
