import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { customAlphabet } from 'nanoid'

/** slug 字母表：小写字母 + 数字（与 file_name 校验正则一致） */
const newSlug = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10)

const MAX_SLUG_RETRIES = 5

/** 将 HTML 内容写入 files/{slug}.html，slug 冲突时重试（≤5 次） */
export function saveHtmlFile(dataDir: string, content: Buffer): {
  slug: string
  fileName: string
} {
  const filesDir = join(dataDir, 'files')
  mkdirSync(filesDir, { recursive: true })
  for (let i = 0; i < MAX_SLUG_RETRIES; i++) {
    const slug = newSlug()
    const fileName = `${slug}.html`
    const filePath = join(filesDir, fileName)
    if (!existsSync(filePath)) {
      writeFileSync(filePath, content)
      return { slug, fileName }
    }
  }
  throw new Error('无法生成唯一的 slug')
}

/** 删除文件；文件已不存在（ENOENT）时静默忽略 */
export function deleteHtmlFile(dataDir: string, fileName: string): void {
  try {
    unlinkSync(join(dataDir, 'files', fileName))
  } catch (err) {
    if ((err as { code?: string }).code !== 'ENOENT') throw err
  }
}
