import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getPage } from '@/app/p/[slug]/route'
import { GET as health } from '@/app/api/health/route'
import { POST as upload } from '@/app/api/bookmarks/upload/route'
import { getDb } from '@/lib/db'
import { tempDataDir, cleanupDataDir } from '@/tests/helpers'

function pageReq(slug: string) {
  return new NextRequest(`http://localhost/p/${slug}`)
}
function params(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

let dataDir: string
beforeAll(() => {
  dataDir = tempDataDir()
})
afterAll(() => cleanupDataDir(dataDir))

describe('health', () => {
  it('返回 ok', async () => {
    const res = await health()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})

describe('/p/[slug] 页面托管', () => {
  it('托管上传的页面：内容与 Content-Type 正确', async () => {
    const html = '<html><body><h1>hi</h1></body></html>'
    const fd = new FormData()
    fd.append('file', new File([html], 'hi.html', { type: 'text/html' }))
    const up = await upload(new NextRequest('http://localhost/api/bookmarks/upload', {
      method: 'POST',
      body: fd,
    }))
    const { slug } = (await up.json()).bookmark

    const res = await getPage(pageReq(slug), params(slug))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(await res.text()).toBe(html)
  })

  it('未知 slug 404；路径穿越 slug 404', async () => {
    expect((await getPage(pageReq('nosuch123'), params('nosuch123'))).status).toBe(404)
    expect((await getPage(pageReq('x'), params('../evil'))).status).toBe(404)
    expect((await getPage(pageReq('x'), params('a%2F..%2Fevil'))).status).toBe(404)
  })

  it('库中被篡改的 file_name 不能越出 files 目录', async () => {
    getDb()
      .prepare(
        "INSERT INTO bookmarks (type, title, slug, file_name) VALUES ('file', 'evil', 'evil12345', '../evil.html')"
      )
      .run()
    expect((await getPage(pageReq('evil12345'), params('evil12345'))).status).toBe(404)
  })
})
