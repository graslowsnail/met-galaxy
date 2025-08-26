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
  // Enhanced metadata for focal artwork display
  creditLine?: string | null
  description?: string | null
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

// Field Chunk API Types (new directional similarity system)
export interface FieldChunkMeta {
  targetId: number
  chunk: { x: number; y: number }
  r: number            // distance from center
  theta: number        // angle (radians)
  t: number            // temperature 0..1
  weights: { sim: number; drift: number; rand: number }
  seed: number
}

export interface FieldChunkItem {
  id: number
  objectId: number
  title: string | null
  artist: string | null
  imageUrl: string | null          // always non-null in practice
  originalImageUrl: string | null
  imageSource: 's3' | 'met_small' | 'met_original' | null
  similarity: number | null        // present for sim/drift
  source: 'sim' | 'drift' | 'rand' // provenance tag
  // Enhanced metadata for focal artwork display
  date?: string | null
  department?: string | null
  creditLine?: string | null
  description?: string | null
}

export interface FieldChunkResponse {
  success: boolean
  meta: FieldChunkMeta
  data: FieldChunkItem[]
  responseTime: string
}

// Multi-Chunk API Types
export interface MultiChunkMeta {
  targetId: number
  totalChunks: number
  globalExcludes: number
  seed: number
  t: number
}

export interface MultiChunkData {
  chunk: { x: number; y: number }
  artworks: FieldChunkItem[]
  meta: {
    r: number
    theta: number
    t: number
    weights: { sim: number; drift: number; rand: number }
  }
}

export interface MultiChunkResponse {
  success: boolean
  meta: MultiChunkMeta
  data: Record<string, MultiChunkData>
  responseTime: string
}

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  endpoints: {
    randomArtworks: '/api/artworks/random',
    chunkArtworks: '/api/artworks/chunk',
    artworkCount: '/api/artworks/count',
    similarArtworks: '/api/artworks/similar',
    fieldChunk: '/api/artworks/field-chunk',
    fieldChunks: '/api/artworks/field-chunks',
  }
} as const
