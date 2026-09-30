import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/categories/route'
import { PATCH, DELETE } from '@/app/api/categories/[id]/route'
import { getDb } from '@/lib/db'
import { tempDataDir, cleanupDataDir, jsonReq } from '@/tests/helpers'

const BASE = 'http://localhost/api/categories'

/** 动态路由第二参数（Next 15 中 params 是 Promise） */
function params(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) }
}

let dataDir: string
beforeAll(() => {
  dataDir = tempDataDir()
})
afterAll(() => cleanupDataDir(dataDir))

describe('分类 API', () => {
  it('创建分类返回 201', async () => {
    const res = await POST(jsonReq('POST', BASE, { name: '报表' }))
    expect(res.status).toBe(201)
    expect((await res.json()).category.name).toBe('报表')
  })

  it('空名 400，重名 409', async () => {
    expect((await POST(jsonReq('POST', BASE, { name: '   ' }))).status).toBe(400)
    expect((await POST(jsonReq('POST', BASE, { name: '报表' }))).status).toBe(409)
    expect((await (await POST(jsonReq('POST', BASE, { name: '报表' }))).json()).error).toBe(
      '分类名已存在'
    )
  })

  it('GET 返回带 count 且按 sort_order 排序', async () => {
    const db = getDb()
    const tool = db
      .prepare("INSERT INTO categories (name, sort_order) VALUES ('工具', -10)")
      .run()
    db.prepare("INSERT INTO categories (name, sort_order) VALUES ('文档', -20)").run()
    db.prepare("INSERT INTO bookmarks (type, title, category_id) VALUES ('link', 't', ?)").run(
      tool.lastInsertRowid
    )

    const res = await GET()
    expect(res.status).toBe(200)
    const { categories } = await res.json()
    expect(categories[0].name).toBe('文档')
    const toolCat = categories.find((c: { name: string }) => c.name === '工具')
    expect(toolCat.count).toBe(1)
  })

  it('PATCH 改名成功，未知 id 404', async () => {
    const created = await POST(jsonReq('POST', BASE, { name: '待改名' }))
    const id = (await created.json()).category.id

    const res = await PATCH(jsonReq('PATCH', `${BASE}/${id}`, { name: '新名' }), params(id))
    expect(res.status).toBe(200)
    expect((await res.json()).category.name).toBe('新名')

    expect(
      (
        await PATCH(jsonReq('PATCH', `${BASE}/99999`, { name: 'x' }), params(99999))
      ).status
    ).toBe(404)
  })

  it('调序：相邻互换 sort_order 后列表顺序真的改变', async () => {
    const mk = async (name: string) =>
      ((await (await POST(jsonReq('POST', BASE, { name }))).json()).category) as {
        id: number
        sort_order: number
      }
    const a = await mk('调序A')
    const b = await mk('调序B')
    const c = await mk('调序C')

    // UI 的上移 = 相邻两条互换 sort_order（两次 PATCH）
    await PATCH(jsonReq('PATCH', `${BASE}/${b.id}`, { sort_order: a.sort_order }), params(b.id))
    await PATCH(jsonReq('PATCH', `${BASE}/${a.id}`, { sort_order: b.sort_order }), params(a.id))

    const { categories } = await (await GET()).json()
    const names = (categories as { name: string }[])
      .filter((x) => ['调序A', '调序B', '调序C'].includes(x.name))
      .map((x) => x.name)
    expect(names).toEqual(['调序B', '调序A', '调序C'])
  })

  it('DELETE 分类后书签归为未分类', async () => {
    const created = await POST(jsonReq('POST', BASE, { name: '临时分类' }))
    const id = (await created.json()).category.id
    const db = getDb()
    const bm = db
      .prepare("INSERT INTO bookmarks (type, title, category_id) VALUES ('link', 't', ?)")
      .run(id)

    const res = await DELETE(jsonReq('DELETE', `${BASE}/${id}`), params(id))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const row = db.prepare('SELECT category_id FROM bookmarks WHERE id = ?').get(bm.lastInsertRowid)
    expect(row).toEqual({ category_id: null })
  })
})
