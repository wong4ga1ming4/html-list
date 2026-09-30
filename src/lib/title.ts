/** 从 HTML 中提取 <title>（纯函数，客户端组件也可使用） */
export function extractTitle(html: string, fallback: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  const title = match ? match[1].trim() : ''
  if (!title) return fallback
  return title.length > 100 ? title.slice(0, 100) : title
}
