import type { Artwork } from '@/types/api'

// The preview headline is deliberately generic: a bare artwork title reads like
// a product listing in a chat thread, so the card says what the link *is* and
// leaves the specifics to the description.
export const SHARE_HEADLINE = "I found this in The Met's back rooms"

export const artworkLabel = (artwork: Artwork) => (
  artwork.artist
    ? `${artwork.title ?? 'Untitled'} — ${artwork.artist}`
    : artwork.title ?? 'Untitled'
)

export const artworkFacts = (artwork: Artwork) => (
  [artwork.date, artwork.medium, artwork.department].filter(Boolean).join(' · ')
)

export const shareDescription = (artwork: Artwork) => (
  [artworkLabel(artwork), artworkFacts(artwork)].filter(Boolean).join(' · ')
)
