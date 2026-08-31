import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  API_CONFIG,
  type Artwork,
  type ArtworkResponse,
  type SimilarArtwork,
  type SimilarityResponse,
} from "@/types/api"
import { artworkLabel, artworkFacts, SHARE_HEADLINE, shareDescription } from "@/lib/share"

export const revalidate = 86_400

const SITE_URL = "https://www.openmetropolitan.com"
const RELATED_COUNT = 12

const fetchArtwork = async (artworkId: number): Promise<Artwork | null> => {
  try {
    const url = new URL(`${API_CONFIG.endpoints.artwork}/${artworkId}`, API_CONFIG.baseUrl)
    const response = await fetch(url.toString(), { next: { revalidate } })
    if (!response.ok) return null

    const { data } = await response.json() as ArtworkResponse
    return data ?? null
  } catch (error) {
    console.error(`Failed to load artwork ${artworkId}:`, error)
    return null
  }
}

const fetchRelated = async (artworkId: number): Promise<SimilarArtwork[]> => {
  try {
    const url = new URL(`${API_CONFIG.endpoints.similarArtworks}/${artworkId}`, API_CONFIG.baseUrl)
    const response = await fetch(url.toString(), { next: { revalidate } })
    if (!response.ok) return []

    const { data } = await response.json() as SimilarityResponse
    return (data ?? []).filter((item) => !item.original).slice(0, RELATED_COUNT)
  } catch (error) {
    console.error(`Failed to load related artworks for ${artworkId}:`, error)
    return []
  }
}

const parseArtworkId = (value: string) => {
  const artworkId = Number(value)
  return Number.isSafeInteger(artworkId) && artworkId > 0 ? artworkId : null
}

export async function generateMetadata({ params }: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const artworkId = parseArtworkId((await params).id)
  if (!artworkId) return {}

  const artwork = await fetchArtwork(artworkId)
  if (!artwork) return {}

  const heading = artworkLabel(artwork)
  const description = artwork.description
    ?? `${heading}. ${artworkFacts(artwork)}. View this work from The Met's open access collection and explore visually similar pieces.`

  return {
    title: `${heading} | Open Metropolitan`,
    description,
    alternates: { canonical: `/art/${artwork.id}` },
    openGraph: {
      type: 'article',
      locale: 'en_US',
      siteName: 'Open Metropolitan',
      url: `${SITE_URL}/art/${artwork.id}`,
      title: SHARE_HEADLINE,
      description: shareDescription(artwork),
      images: [{
        url: `/api/og/${artwork.id}`,
        alt: heading,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: SHARE_HEADLINE,
      description: shareDescription(artwork),
      images: [`/api/og/${artwork.id}`],
      creator: '@openmetropolitan',
    },
  }
}

export default async function ArtworkPage({ params }: {
  params: Promise<{ id: string }>
}) {
  const artworkId = parseArtworkId((await params).id)
  if (!artworkId) notFound()

  const artwork = await fetchArtwork(artworkId)
  if (!artwork) notFound()

  const related = await fetchRelated(artworkId)

  const title = artwork.title ?? 'Untitled'
  const heading = artworkLabel(artwork)
  const imageUrl = artwork.originalImageUrl ?? artwork.imageUrl

  const facts = [
    ['Artist', artwork.artist],
    ['Date', artwork.date],
    ['Medium', artwork.medium],
    ['Culture', artwork.culture],
    ['Department', artwork.department],
    ['Credit line', artwork.creditLine],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-[#efece4] px-5 py-10 text-[#3c3931] sm:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VisualArtwork",
            name: title,
            ...(artwork.artist ? { creator: { "@type": "Person", name: artwork.artist } } : {}),
            ...(artwork.date ? { dateCreated: artwork.date } : {}),
            ...(artwork.medium ? { artMedium: artwork.medium } : {}),
            ...(artwork.description ? { description: artwork.description } : {}),
            ...(imageUrl ? { image: imageUrl } : {}),
            url: `${SITE_URL}/art/${artwork.id}`,
            isBasedOn: artwork.objectUrl ?? undefined,
            creditText: artwork.creditLine ?? undefined,
            accessMode: "visual",
            isAccessibleForFree: true,
          }),
        }}
      />

      <nav className="mb-8 text-sm">
        <Link href="/" className="underline underline-offset-4 hover:no-underline">
          Open Metropolitan
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span className="opacity-70">{title}</span>
      </nav>

      <article>
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
        {artwork.artist && (
          <p className="mt-2 text-lg opacity-80">{artwork.artist}</p>
        )}
        {artworkFacts(artwork) && (
          <p className="mt-1 text-sm opacity-60">{artworkFacts(artwork)}</p>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt={heading}
            className="mt-8 max-h-[70vh] w-auto max-w-full rounded-sm bg-white/40 shadow-sm"
          />
        )}

        {artwork.description && (
          <p className="mt-8 max-w-2xl leading-relaxed">{artwork.description}</p>
        )}

        {facts.length > 0 && (
          <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[10rem_1fr]">
            {facts.map(([label, value]) => (
              <div key={label} className="sm:contents">
                <dt className="text-sm font-semibold opacity-60">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/?path=${artwork.id}`}
            className="rounded-full bg-[#3c3931] px-5 py-2.5 text-sm font-semibold text-[#efece4] hover:opacity-90"
          >
            Explore similar works visually
          </Link>
          {artwork.objectUrl && (
            <a
              href={artwork.objectUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="rounded-full border border-[#3c3931]/30 px-5 py-2.5 text-sm font-semibold hover:bg-white/40"
            >
              View on metmuseum.org
            </a>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-16 border-t border-[#3c3931]/15 pt-10">
          <h2 className="font-serif text-2xl">Visually similar works</h2>
          <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <Link href={`/art/${item.id}`} className="group block">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="aspect-square w-full rounded-sm bg-white/40 object-contain"
                  />
                  <span className="mt-2 block text-sm leading-snug group-hover:underline">
                    {item.title}
                  </span>
                  {item.artist && (
                    <span className="block text-xs opacity-60">{item.artist}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-16 border-t border-[#3c3931]/15 pt-6 text-xs leading-relaxed opacity-60">
        <p>
          Open Metropolitan is an independent project built on{' '}
          <a
            href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access"
            rel="noopener noreferrer"
            target="_blank"
            className="underline underline-offset-2"
          >
            The Metropolitan Museum of Art&apos;s Open Access initiative
          </a>
          . It is not affiliated with or endorsed by the museum.
        </p>
      </footer>
    </main>
  )
}
