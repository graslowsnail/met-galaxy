export function GET() {
  return new Response('Sitemap retired', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  })
}
