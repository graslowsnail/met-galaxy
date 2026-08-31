import sharp from 'sharp'
import { API_CONFIG, type ArtworkResponse } from '@/types/api'

export const runtime = 'nodejs'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630
const CARD_BACKGROUND = { r: 0xef, g: 0xec, b: 0xe4, alpha: 1 }
const UPSTREAM_TIMEOUT_MS = 8_000
const CARD_CACHE_CONTROL = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800'

const fetchArtworkImageUrl = async (artworkId: number, signal: AbortSignal) => {
  const url = new URL(`${API_CONFIG.endpoints.artwork}/${artworkId}`, API_CONFIG.baseUrl)
  const response = await fetch(url.toString(), { signal, next: { revalidate: 86_400 } })
  if (!response.ok) return null

  const { data } = await response.json() as ArtworkResponse
  return data?.originalImageUrl ?? data?.imageUrl ?? null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fallback = Response.redirect(new URL('/og-image.png', request.url), 307)

  const artworkId = Number((await params).id)
  if (!Number.isSafeInteger(artworkId) || artworkId <= 0) return fallback

  const timeout = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)

  try {
    const imageUrl = await fetchArtworkImageUrl(artworkId, timeout)
    if (!imageUrl) return fallback

    const upstream = await fetch(imageUrl, { signal: timeout, cache: 'force-cache' })
    if (!upstream.ok) return fallback

    const card = await sharp(Buffer.from(await upstream.arrayBuffer()))
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'contain', background: CARD_BACKGROUND })
      .flatten({ background: CARD_BACKGROUND })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()

    return new Response(new Uint8Array(card), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(card.byteLength),
        'Cache-Control': CARD_CACHE_CONTROL,
      },
    })
  } catch (error) {
    console.error(`Failed to render share card for artwork ${artworkId}:`, error)
    return fallback
  }
}
