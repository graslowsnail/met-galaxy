import type { Metadata } from "next"
import HomeClient from "./home-client"
import { API_CONFIG, type Artwork, type ArtworkResponse } from "@/types/api"
import { artworkLabel, SHARE_HEADLINE, shareDescription } from "@/lib/share"

const SHARED_ARTWORK_REVALIDATE_SECONDS = 86_400

const readSharedPath = (params: Record<string, string | string[] | undefined>) => {
  const raw = params.path ?? params.artwork
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return null

  const ids = value.split(',').map(Number)
  if (
    ids.length === 0
    || ids.length > 100
    || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  ) {
    return null
  }
  return ids
}

const fetchSharedArtwork = async (artworkId: number): Promise<Artwork | null> => {
  try {
    const url = new URL(`${API_CONFIG.endpoints.artwork}/${artworkId}`, API_CONFIG.baseUrl)
    const response = await fetch(url.toString(), {
      next: { revalidate: SHARED_ARTWORK_REVALIDATE_SECONDS },
    })
    if (!response.ok) return null

    const { data } = await response.json() as ArtworkResponse
    return data ?? null
  } catch (error) {
    console.error('Failed to load shared artwork for metadata:', error)
    return null
  }
}

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const pathIds = readSharedPath(await searchParams)
  if (!pathIds) return {}

  const artwork = await fetchSharedArtwork(pathIds.at(-1)!)
  if (!artwork?.originalImageUrl && !artwork?.imageUrl) return {}

  const heading = artworkLabel(artwork)
  const description = shareDescription(artwork)

  const images = [{
    url: `/api/og/${artwork.id}`,
    alt: heading,
  }]

  return {
    title: `${heading} | Open Metropolitan`,
    description,
    // A share URL can't describe itself: Next collapses any metadata URL whose
    // pathname is "/" down to the origin, dropping ?path=. Emitting no canonical
    // and no og:url leaves unfurlers on the URL they fetched, which is correct;
    // inheriting the layout's root canonical would send them to the default card.
    alternates: {
      canonical: null,
    },
    openGraph: {
      type: 'article',
      locale: 'en_US',
      siteName: 'Open Metropolitan',
      title: SHARE_HEADLINE,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: SHARE_HEADLINE,
      description,
      images: images.map((image) => image.url),
      creator: '@openmetropolitan',
    },
  }
}

export default function Home() {
  return <HomeClient />
}
