// API Types for frontend

export interface Artwork {
  id: string
  objectId: number
  title: string | null
  artist: string | null
  date: string | null
  primaryImage: string | null
  primaryImageSmall: string | null
  department: string | null
  culture: string | null
  medium: string | null
}

export interface RandomArtworksResponse {
  artworks: Artwork[]
  total: number
}

export interface ArtworkCountResponse {
  count: number
}

export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
}

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  endpoints: {
    randomArtworks: '/artworks/random',
    chunkArtworks: '/artworks/chunk',
    artworkCount: '/artworks/count',
  }
} as const
