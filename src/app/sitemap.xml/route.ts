import { fetchArtworkIdPage, SITE_URL, SITEMAP_PAGE_SIZE } from '@/lib/sitemap'

export const revalidate = 86_400

export async function GET() {
  // A backend blip should degrade to the homepage sitemap, not 500 at Google.
  let pageCount = 0
  try {
    const { total } = await fetchArtworkIdPage(0, 1)
    pageCount = Math.max(Math.ceil(total / SITEMAP_PAGE_SIZE), 1)
  } catch (error) {
    console.error('Failed to size the artwork sitemap:', error)
  }

  const children = Array.from({ length: pageCount }, (_, page) =>
    `  <sitemap><loc>${SITE_URL}/sitemaps/${page}.xml</loc></sitemap>`
  ).join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE_URL}/sitemaps/pages.xml</loc></sitemap>${children ? `\n${children}` : ''}
</sitemapindex>
`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
