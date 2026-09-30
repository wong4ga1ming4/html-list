import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { closeDb } from '@/lib/db'

/** 创建临时数据目录并设为 DATA_DIR，返回目录路径 */
export function tempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'html-list-'))
  process.env.DATA_DIR = dir
  return dir
}

/** 关闭数据库单例并删除临时目录 */
export function cleanupDataDir(dir: string): void {
  closeDb()
  rmSync(dir, { recursive: true, force: true })
}

/** 构造 JSON 请求 */
export function jsonReq(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  })
}
