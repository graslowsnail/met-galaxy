import { API_CONFIG, type RandomArtworksResponse, type RandomChunksResponse, type ArtworkCountResponse, type ArtworkResponse, type ArtworksResponse, type ArtworkLikeResponse, type MostLikedResponse, type ErrorResponse, type BackendResponse, type SimilarityResponse, type FieldChunkResponse, type MultiChunkResponse, type SearchResponse } from '@/types/api'

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public error?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ErrorResponse | null = null
    try {
      errorData = await response.json() as ErrorResponse
    } catch {
      // If we can't parse the error response, use the status text
    }
    
    throw new ApiError(
      errorData?.message ?? response.statusText,
      response.status,
      errorData?.error
    )
  }
  
  return response.json() as T
}

export const apiClient = {
  async getRandomArtworks(params: { count?: number; seed?: number } = {}): Promise<RandomArtworksResponse> {
    const url = new URL(API_CONFIG.endpoints.randomArtworks, API_CONFIG.baseUrl)
    
    if (params.count !== undefined) {
      url.searchParams.set('count', params.count.toString())
    }
    if (params.seed !== undefined) {
      url.searchParams.set('seed', params.seed.toString())
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const backendResult = await handleResponse<BackendResponse>(response)
    
    // Transform backend response to expected frontend format
    const result: RandomArtworksResponse = {
      artworks: backendResult.data.map(artwork => ({
        ...artwork,
        // Map imageUrl to primaryImage for backward compatibility
        primaryImage: artwork.imageUrl,
        primaryImageSmall: artwork.imageUrl, // Use same image for both
      })),
      total: backendResult.data.length
    }
    
    return result
  },

  async getChunkArtworks(params: { chunkX: number; chunkY: number; count?: number }): Promise<RandomArtworksResponse> {
    const result = await this.getChunkArtworksBatch({
      chunks: [{ x: params.chunkX, y: params.chunkY }],
      count: params.count,
    })
    const artworks = result[`${params.chunkX},${params.chunkY}`] ?? []
    return { artworks, total: artworks.length }
  },

  async getChunkArtworksBatch(params: {
    chunks: Array<{ x: number; y: number }>
    count?: number
    seed?: number
  }): Promise<Record<string, RandomArtworksResponse['artworks']>> {
    const url = new URL(API_CONFIG.endpoints.randomChunks, API_CONFIG.baseUrl)
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunks: params.chunks,
        count: params.count ?? 20,
        seed: params.seed ?? 0,
      }),
    })
    const result = await handleResponse<RandomChunksResponse>(response)
    return Object.fromEntries(
      Object.entries(result.data).map(([key, artworks]) => [
        key,
        artworks.map((artwork) => ({
          ...artwork,
          primaryImage: artwork.imageUrl,
          primaryImageSmall: artwork.imageUrl,
        })),
      ]),
    )
  },

  async getArtworkCount(): Promise<ArtworkCountResponse> {
    const url = new URL(API_CONFIG.endpoints.artworkCount, API_CONFIG.baseUrl)
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    return handleResponse<ArtworkCountResponse>(response)
  },

  async getArtwork(artworkId: number, signal?: AbortSignal): Promise<ArtworkResponse> {
    const url = new URL(`${API_CONFIG.endpoints.artwork}/${artworkId}`, API_CONFIG.baseUrl)
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal,
      headers: { 'Content-Type': 'application/json' },
    })

    return handleResponse<ArtworkResponse>(response)
  },

  async getArtworks(artworkIds: number[], signal?: AbortSignal): Promise<ArtworksResponse> {
    const url = new URL(API_CONFIG.endpoints.artworksByIds, API_CONFIG.baseUrl)
    const response = await fetch(url.toString(), {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: artworkIds }),
    })

    return handleResponse<ArtworksResponse>(response)
  },

  async getArtworkLikeState(artworkId: number, voterId: string, signal?: AbortSignal): Promise<ArtworkLikeResponse> {
    const url = new URL(`${API_CONFIG.endpoints.likes}/${artworkId}`, API_CONFIG.baseUrl)
    url.searchParams.set('voterId', voterId)
    const response = await fetch(url.toString(), { signal })
    return handleResponse<ArtworkLikeResponse>(response)
  },

  async setArtworkLiked(artworkId: number, voterId: string, liked: boolean): Promise<ArtworkLikeResponse> {
    const url = new URL(`${API_CONFIG.endpoints.likes}/${artworkId}`, API_CONFIG.baseUrl)
    const response = await fetch(url.toString(), {
      method: liked ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId }),
    })
    return handleResponse<ArtworkLikeResponse>(response)
  },

  async getMostLikedArtworks(voterId: string, count = 20, signal?: AbortSignal): Promise<MostLikedResponse> {
    const url = new URL(`${API_CONFIG.endpoints.likes}/most`, API_CONFIG.baseUrl)
    url.searchParams.set('voterId', voterId)
    url.searchParams.set('count', String(count))
    const response = await fetch(url.toString(), { signal })
    return handleResponse<MostLikedResponse>(response)
  },

  async getSimilarArtworks(artworkId: number): Promise<SimilarityResponse> {
    const url = new URL(`${API_CONFIG.endpoints.similarArtworks}/${artworkId}`, API_CONFIG.baseUrl)
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const result = await handleResponse<SimilarityResponse>(response)
    
    return result
  },

  async fetchFieldChunk(params: {
    targetId: number
    chunkX: number
    chunkY: number
    count?: number
    excludeIds?: number[]
    seed?: number
    signal?: AbortSignal
  }): Promise<FieldChunkResponse> {
    const qs = new URLSearchParams({
      targetId: String(params.targetId),
      chunkX: String(params.chunkX),
      chunkY: String(params.chunkY),
      ...(params.count ? { count: String(params.count) } : {}),
      ...(params.seed ? { seed: String(params.seed) } : {}),
      ...(params.excludeIds?.length
        ? { exclude: params.excludeIds.join(',') }
        : {}),
    })

    const url = new URL(API_CONFIG.endpoints.fieldChunk, API_CONFIG.baseUrl)
    url.search = qs.toString()
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: params.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) throw new Error(`field-chunk http ${response.status}`)
    const json = (await response.json()) as FieldChunkResponse
    if (!json.success) throw new Error(`field-chunk error: ${(json as { error?: string }).error ?? 'unknown'}`)
    return json
  },

  async fetchMultipleChunks(params: {
    targetId: number
    chunks: Array<{ x: number; y: number }>
    count?: number
    excludeIds?: number[]
    seed?: number
    signal?: AbortSignal
  }): Promise<MultiChunkResponse> {
    const url = new URL(API_CONFIG.endpoints.fieldChunks, API_CONFIG.baseUrl)
    
    const requestBody = {
      targetId: params.targetId,
      chunks: params.chunks,
      count: params.count ?? 20,
      ...(params.excludeIds?.length ? { excludeIds: params.excludeIds } : {}),
      ...(params.seed ? { seed: params.seed } : {})
    }
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      signal: params.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null) as {
        error?: string
        details?: string
      } | null
      throw new Error(
        error?.details ?? error?.error ?? `field-chunks http ${response.status}`
      )
    }
    const json = (await response.json()) as MultiChunkResponse
    if (!json.success) throw new Error(`field-chunks error: ${(json as { error?: string }).error ?? 'unknown'}`)
    return json
  },

  async searchArtworks(params: {
    q: string
    count?: number
    cursor?: string
    signal?: AbortSignal
  }): Promise<SearchResponse> {
    const url = new URL(API_CONFIG.endpoints.search, API_CONFIG.baseUrl)
    url.searchParams.set('q', params.q)
    if (params.count) {
      url.searchParams.set('count', params.count.toString())
    }
    if (params.cursor) {
      url.searchParams.set('cursor', params.cursor)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: params.signal,
    })

    if (!response.ok) throw new Error(`search http ${response.status}`)
    const json = (await response.json()) as SearchResponse
    if (!json.success) throw new Error(`search error: ${(json as { error?: string }).error ?? 'unknown'}`)
    return json
  },
}
