export interface Bookmark {
  id: number
  type: 'file' | 'link'
  title: string
  description: string
  url: string | null
  slug: string | null
  category_id: number | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  sort_order: number
}
