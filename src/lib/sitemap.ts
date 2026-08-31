import { API_CONFIG } from '@/types/api'

export const SITE_URL = 'https://www.openmetropolitan.com'

// The sitemap spec caps a urlset at 50,000; the backend caps a page at the same.
export const SITEMAP_PAGE_SIZE = 50_000

interface ArtworkIdsResponse {
  success: boolean
  data: { ids: number[]; total: number; pageSize: number }
}

export const fetchArtworkIdPage = async (offset: number, limit?: number) => {
  const url = new URL('/api/artworks/ids', API_CONFIG.baseUrl)
  url.searchParams.set('offset', String(offset))
  if (limit !== undefined) url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), { next: { revalidate: 86_400 } })
  if (!response.ok) throw new Error(`artwork ids http ${response.status}`)

  const { data } = await response.json() as ArtworkIdsResponse
  return data
}
