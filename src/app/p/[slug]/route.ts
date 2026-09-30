import { NextRequest } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ slug: string }> }

/** Response 的 body 是一次性流，不能模块级共享：每次 404 都要新造一个 */
function notFound() {
  return new Response('Not Found', { status: 404 })
}

/** file_name 只可能来自 saveHtmlFile 生成；此正则为纵深防御，杜绝路径穿越 */
const SAFE_FILE_NAME = /^[a-z0-9]{10}\.html$/

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params

  const row = getDb()
    .prepare("SELECT file_name FROM bookmarks WHERE slug = ? AND type = 'file'")
    .get(slug) as { file_name: string | null } | undefined
  if (!row?.file_name || !SAFE_FILE_NAME.test(row.file_name)) {
    return notFound()
  }

  const dataDir = process.env.DATA_DIR || './data'
  try {
    const buffer = await readFile(join(dataDir, 'files', row.file_name))
    return new Response(buffer, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } catch {
    return notFound()
  }
}
