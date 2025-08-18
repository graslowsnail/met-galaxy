// API Types for frontend

export interface Artwork {
  id: number
  objectId: number
  title: string | null
  artist: string | null
  date: string | null
  imageUrl: string | null
  originalImageUrl: string | null
  imageSource: string | null
  department: string | null
  culture: string | null
  medium: string | null
  // For backward compatibility
  primaryImage?: string | null
  primaryImageSmall?: string | null
}

export interface BackendResponse {
  success: boolean
  data: Artwork[]
}

export interface RandomArtworksResponse {
  artworks: Artwork[]
  total: number
}

export interface SimilarArtwork {
  id: number
  objectId: number
  title: string
  artist: string
  imageUrl: string
  originalImageUrl: string
  imageSource: "s3"
  original: boolean
  similarity: number
}

export interface SimilarityResponse {
  success: boolean
  data: SimilarArtwork[]
  meta: {
    targetId: number
    targetTitle: string
    targetArtist: string
    count: number
    responseTime: string
  }
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
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  endpoints: {
    randomArtworks: '/api/artworks/random',
    chunkArtworks: '/api/artworks/chunk',
    artworkCount: '/api/artworks/count',
    similarArtworks: '/api/artworks/similar',
  }
} as const
