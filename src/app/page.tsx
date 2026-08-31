import type { Metadata } from "next"
import HomeClient from "./home-client"
import { API_CONFIG, type Artwork, type ArtworkResponse } from "@/types/api"

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

  const title = artwork.title ?? 'Untitled'
  const heading = artwork.artist ? `${title} — ${artwork.artist}` : title
  const description = [artwork.date, artwork.medium, artwork.department]
    .filter(Boolean)
    .join(' · ')
    || 'Explore this artwork and its neighbours in The Met collection.'

  const images = [{
    url: `/api/og/${artwork.id}`,
    width: 1200,
    height: 630,
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
      title: heading,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: heading,
      description,
      images: images.map((image) => image.url),
      creator: '@openmetropolitan',
    },
  }
}

export default function Home() {
  return <HomeClient />
}
