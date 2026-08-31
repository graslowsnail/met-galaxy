import { fetchArtworkIdPage, SITE_URL, SITEMAP_PAGE_SIZE } from '@/lib/sitemap'

export const revalidate = 86_400

const XML_HEADERS = {
  'Content-Type': 'application/xml',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
}

const urlset = (locs: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n')}
</urlset>
`

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const slug = (await params).page.replace(/\.xml$/, '')

  if (slug === 'pages') {
    return new Response(urlset([`${SITE_URL}/`]), { headers: XML_HEADERS })
  }

  const page = Number(slug)
  if (!Number.isSafeInteger(page) || page < 0) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const { ids, total } = await fetchArtworkIdPage(page * SITEMAP_PAGE_SIZE)
    if (page > 0 && page * SITEMAP_PAGE_SIZE >= total) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(
      urlset(ids.map((id) => `${SITE_URL}/art/${id}`)),
      { headers: XML_HEADERS },
    )
  } catch (error) {
    console.error(`Failed to build sitemap page ${page}:`, error)
    return new Response('Sitemap unavailable', { status: 503 })
  }
}
