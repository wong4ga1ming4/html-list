import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GET, POST } from '@/app/api/bookmarks/route'
import { PATCH, DELETE } from '@/app/api/bookmarks/[id]/route'
import { POST as POST_CATEGORY } from '@/app/api/categories/route'
import { tempDataDir, cleanupDataDir, jsonReq } from '@/tests/helpers'

const BASE = 'http://localhost/api/bookmarks'

function params(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) }
}

let dataDir: string
beforeAll(() => {
  dataDir = tempDataDir()
})
afterAll(() => cleanupDataDir(dataDir))

async function createBookmark(body: Record<string, unknown>) {
  const res = await POST(jsonReq('POST', BASE, body))
  return { res, bookmark: (await res.json()).bookmark }
}

describe('链接书签 API', () => {
  it('创建链接书签 201', async () => {
    const { res, bookmark } = await createBookmark({
      title: 'ECharts',
      url: 'https://echarts.apache.org',
      description: '图表库',
    })
    expect(res.status).toBe(201)
    expect(bookmark.type).toBe('link')
    expect(bookmark.slug).toBeNull()
    expect(bookmark.title).toBe('ECharts')
  })

  it('空白标题 400 / 非法 URL 400 / 未知分类 400', async () => {
    const blankTitle = await POST(
      jsonReq('POST', BASE, { title: '   ', url: 'https://a.com' })
    )
    expect(blankTitle.status).toBe(400)
    expect((await blankTitle.json()).error).toBe('标题不能为空')

    const badUrl = await POST(jsonReq('POST', BASE, { title: 't', url: 'ftp://a.com' }))
    expect(badUrl.status).toBe(400)

    const badCategory = await POST(
      jsonReq('POST', BASE, { title: 't', url: 'https://a.com', category_id: 99999 })
    )
    expect(badCategory.status).toBe(400)
    expect((await badCategory.json()).error).toBe('分类不存在')
  })

  it('q 命中 title、description、url；不命中返回空', async () => {
    await createBookmark({
      title: '月度销售报表',
      url: 'https://sales.example.com/q1',
      description: '销售数据汇总',
    })

    const byTitle = await GET(jsonReq('GET', `${BASE}?q=${encodeURIComponent('销售报表')}`))
    expect(((await byTitle.json()).bookmarks as { title: string }[]).some((b) => b.title === '月度销售报表')).toBe(true)

    const byDesc = await GET(jsonReq('GET', `${BASE}?q=${encodeURIComponent('数据汇总')}`))
    expect(((await byDesc.json()).bookmarks as { title: string }[]).some((b) => b.title === '月度销售报表')).toBe(true)

    const byUrl = await GET(jsonReq('GET', `${BASE}?q=${encodeURIComponent('sales.example')}`))
    expect(((await byUrl.json()).bookmarks as { title: string }[]).some((b) => b.title === '月度销售报表')).toBe(true)

    const noHit = await GET(jsonReq('GET', `${BASE}?q=zzz不存在的词`))
    expect((await noHit.json()).bookmarks).toHaveLength(0)
  })

  it('搜索词含 % 时不当作通配符', async () => {
    await createBookmark({ title: '100% 增长', url: 'https://a.com/growth' })

    // 转义后 % 只字面匹配含 % 的书签（恰好 1 条）；
    // 若未转义会被当作通配符匹配全部（此前已有 2 条不含 % 的书签，会是 3 条）
    const all = await GET(jsonReq('GET', `${BASE}?q=%25`))
    const pctList = (await all.json()).bookmarks as { title: string }[]
    expect(pctList).toHaveLength(1)
    expect(pctList[0].title).toBe('100% 增长')

    const literal = await GET(jsonReq('GET', `${BASE}?q=${encodeURIComponent('100% 增')}`))
    const list = (await literal.json()).bookmarks as { title: string }[]
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('100% 增长')
  })

  it('category 筛选：分类 id 与 uncategorized', async () => {
    const catRes = await POST_CATEGORY(jsonReq('POST', 'http://localhost/api/categories', { name: '筛选分类' }))
    const catId = (await catRes.json()).category.id
    const { bookmark: inCat } = await createBookmark({
      title: '分类内书签',
      url: 'https://a.com/in',
      category_id: catId,
    })
    await createBookmark({ title: '分类外书签', url: 'https://a.com/out' })

    const byCat = await GET(jsonReq('GET', `${BASE}?category=${catId}`))
    const catList = (await byCat.json()).bookmarks as { id: number; title: string }[]
    expect(catList.map((b) => b.title)).toEqual(['分类内书签'])
    expect(catList[0].id).toBe(inCat.id)

    const uncategorized = await GET(jsonReq('GET', `${BASE}?category=uncategorized`))
    const unList = (await uncategorized.json()).bookmarks as { title: string }[]
    expect(unList.some((b) => b.title === '分类外书签')).toBe(true)
    expect(unList.some((b) => b.title === '分类内书签')).toBe(false)
  })

  it('PATCH 部分更新与 updated_at 变化；未知 id 404', async () => {
    const { bookmark } = await createBookmark({ title: '原始标题', url: 'https://a.com/patch' })
    await new Promise((r) => setTimeout(r, 1100)) // 时间戳为秒级精度

    const res = await PATCH(
      jsonReq('PATCH', `${BASE}/${bookmark.id}`, { description: '新描述' }),
      params(bookmark.id)
    )
    expect(res.status).toBe(200)
    const updated = (await res.json()).bookmark
    expect(updated.description).toBe('新描述')
    expect(updated.title).toBe('原始标题')
    expect(updated.updated_at > bookmark.created_at).toBe(true)

    expect(
      (await PATCH(jsonReq('PATCH', `${BASE}/99999`, { title: 'x' }), params(99999))).status
    ).toBe(404)
  })

  it('PATCH 可修改 URL；非法 URL 400', async () => {
    const { bookmark } = await createBookmark({ title: '改链接', url: 'https://old.example.com' })

    const res = await PATCH(
      jsonReq('PATCH', `${BASE}/${bookmark.id}`, { url: 'https://new.example.com/x' }),
      params(bookmark.id)
    )
    expect(res.status).toBe(200)
    expect((await res.json()).bookmark.url).toBe('https://new.example.com/x')

    expect(
      (
        await PATCH(
          jsonReq('PATCH', `${BASE}/${bookmark.id}`, { url: 'ftp://a.com' }),
          params(bookmark.id)
        )
      ).status
    ).toBe(400)
  })

  it('DELETE 后 GET 列表不再包含', async () => {
    const { bookmark } = await createBookmark({ title: '待删除', url: 'https://a.com/del' })

    const res = await DELETE(jsonReq('DELETE', `${BASE}/${bookmark.id}`), params(bookmark.id))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    const list = await GET(jsonReq('GET', BASE))
    expect(
      ((await list.json()).bookmarks as { id: number }[]).some((b) => b.id === bookmark.id)
    ).toBe(false)

    expect(
      (await DELETE(jsonReq('DELETE', `${BASE}/${bookmark.id}`), params(bookmark.id))).status
    ).toBe(404)
  })
})
