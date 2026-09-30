import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/bookmarks/upload/route'
import { PATCH, DELETE } from '@/app/api/bookmarks/[id]/route'
import { extractTitle } from '@/lib/title'
import { tempDataDir, cleanupDataDir, jsonReq } from '@/tests/helpers'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'http://localhost/api/bookmarks/upload'

function params(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) }
}

function uploadReq(fileName: string, html: string, extra: Record<string, string> = {}) {
  const fd = new FormData()
  fd.append('file', new File([html], fileName, { type: 'text/html' }))
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  return new NextRequest(BASE, { method: 'POST', body: fd })
}

let dataDir: string
beforeAll(() => {
  dataDir = tempDataDir()
})
afterAll(() => cleanupDataDir(dataDir))

describe('title 提取', () => {
  it('提取 title、trim、截断 100、回退 fallback', () => {
    expect(extractTitle('<html><title>  月报  </title></html>', 'f')).toBe('月报')
    expect(extractTitle('<html></html>', 'report')).toBe('report')
    expect(extractTitle(`<title>${'长'.repeat(150)}</title>`, 'f')).toHaveLength(100)
    expect(extractTitle('<TITLE>大写标签</TITLE>', 'f')).toBe('大写标签')
  })
})

describe('上传 API', () => {
  it('上传成功：落盘 + 建记录 + slug 生成', async () => {
    const res = await POST(uploadReq('a.html', '<title>销售月报</title><h1>内容</h1>'))
    expect(res.status).toBe(201)
    const b = (await res.json()).bookmark
    expect(b.title).toBe('销售月报')
    expect(b.type).toBe('file')
    expect(b.slug).toMatch(/^[a-z0-9]{10}$/)
    expect(existsSync(join(dataDir, 'files', `${b.slug}.html`))).toBe(true)
  })

  it('无 title 时回退文件名（去后缀）', async () => {
    const res = await POST(uploadReq('no-title.html', '<html><body>x</body></html>'))
    expect(res.status).toBe(201)
    expect((await res.json()).bookmark.title).toBe('no-title')
  })

  it('显式空白标题 400', async () => {
    const res = await POST(uploadReq('a.html', '<title>t</title>', { title: '   ' }))
    expect(res.status).toBe(400)
  })

  it('PATCH url 对文件型书签 400', async () => {
    const up = await POST(uploadReq('f.html', '<title>文件书签</title>'))
    const { id } = (await up.json()).bookmark
    const res = await PATCH(
      jsonReq('PATCH', `http://localhost/api/bookmarks/${id}`, { url: 'https://x.com' }),
      params(id)
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('文件型书签不支持修改 URL')
  })

  it('非 .html 后缀 400', async () => {
    const res = await POST(uploadReq('a.txt', '<title>t</title>'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('仅支持 .html 文件')
  })

  it('超过大小限制 413', async () => {
    process.env.MAX_UPLOAD_MB = '1'
    try {
      const big = '<html>' + 'x'.repeat(1024 * 1024 + 1) + '</html>'
      const res = await POST(uploadReq('big.html', big))
      expect(res.status).toBe(413)
    } finally {
      delete process.env.MAX_UPLOAD_MB
    }
  })

  it('删除文件书签时清理磁盘文件', async () => {
    const res = await POST(uploadReq('del.html', '<title>待删除文件</title>'))
    const b = (await res.json()).bookmark
    expect(existsSync(join(dataDir, 'files', `${b.slug}.html`))).toBe(true)

    const del = await DELETE(
      new NextRequest(`http://localhost/api/bookmarks/${b.id}`, { method: 'DELETE' }),
      params(b.id)
    )
    expect(del.status).toBe(200)
    expect(existsSync(join(dataDir, 'files', `${b.slug}.html`))).toBe(false)
  })

  it('磁盘文件已丢失时删除仍成功', async () => {
    const res = await POST(uploadReq('lost.html', '<title>文件丢失</title>'))
    const b = (await res.json()).bookmark
    rmSync(join(dataDir, 'files', `${b.slug}.html`))

    const del = await DELETE(
      new NextRequest(`http://localhost/api/bookmarks/${b.id}`, { method: 'DELETE' }),
      params(b.id)
    )
    expect(del.status).toBe(200)
    expect(await del.json()).toEqual({ ok: true })
  })
})
