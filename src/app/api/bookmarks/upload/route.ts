import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { extractTitle } from '@/lib/title'
import { saveHtmlFile } from '@/lib/files'
import type { Bookmark } from '@/lib/types'

const COLUMNS = 'id, type, title, description, url, slug, category_id, created_at, updated_at'

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '缺少文件' }, { status: 400 })
  }

  const maxMb = Number(process.env.MAX_UPLOAD_MB || 20)
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json(
      { error: `文件超过大小限制（${maxMb}MB）` },
      { status: 413 }
    )
  }
  if (!file.name.toLowerCase().endsWith('.html')) {
    return NextResponse.json({ error: '仅支持 .html 文件' }, { status: 400 })
  }

  const content = Buffer.from(await file.arrayBuffer())
  const fallbackTitle = file.name.replace(/\.html$/i, '')

  // 显式提供了 title 字段：trim 后为空 → 400；未提供 → 从内容提取，回退文件名
  const titleField = form?.get('title')
  let title: string
  if (typeof titleField === 'string' && titleField !== '') {
    title = titleField.trim()
    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    }
  } else {
    title = extractTitle(content.toString('utf8'), fallbackTitle)
    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    }
  }

  const descriptionField = form?.get('description')
  const description =
    typeof descriptionField === 'string' ? descriptionField.trim() : ''

  let categoryId: number | null = null
  const categoryIdField = form?.get('category_id')
  if (typeof categoryIdField === 'string' && categoryIdField !== '') {
    categoryId = Number(categoryIdField)
    const exists = Number.isInteger(categoryId)
      ? getDb().prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)
      : undefined
    if (!exists) {
      return NextResponse.json({ error: '分类不存在' }, { status: 400 })
    }
  }

  const dataDir = process.env.DATA_DIR || './data'
  const { slug, fileName } = saveHtmlFile(dataDir, content)

  const info = getDb()
    .prepare(
      "INSERT INTO bookmarks (type, title, description, slug, file_name, category_id) VALUES ('file', ?, ?, ?, ?, ?)"
    )
    .run(title, description, slug, fileName, categoryId)
  const bookmark = getDb()
    .prepare(`SELECT ${COLUMNS} FROM bookmarks WHERE id = ?`)
    .get(info.lastInsertRowid) as Bookmark
  return NextResponse.json({ bookmark }, { status: 201 })
}
