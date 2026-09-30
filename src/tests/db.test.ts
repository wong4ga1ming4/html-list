import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { getDb, closeDb } from '@/lib/db'
import { tempDataDir, cleanupDataDir } from '@/tests/helpers'

let dataDir: string
beforeAll(() => {
  dataDir = tempDataDir()
})
afterAll(() => cleanupDataDir(dataDir))

describe('db 数据层', () => {
  it('首次调用创建数据库文件', () => {
    getDb()
    expect(existsSync(join(dataDir, 'html-list.db'))).toBe(true)
  })

  it('外键约束已开启', () => {
    expect(getDb().pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('外键违规时抛错', () => {
    expect(() =>
      getDb()
        .prepare("INSERT INTO bookmarks (type, title, category_id) VALUES ('link', 't', 999)")
        .run()
    ).toThrow()
  })

  it('type 只能是 file 或 link', () => {
    expect(() =>
      getDb().prepare("INSERT INTO bookmarks (type, title) VALUES ('other', 't')").run()
    ).toThrow()
  })
})
