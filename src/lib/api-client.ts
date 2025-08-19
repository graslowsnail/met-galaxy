import { API_CONFIG, type RandomArtworksResponse, type ArtworkCountResponse, type ErrorResponse, type BackendResponse, type SimilarityResponse } from '@/types/api'

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
    
    console.log('API Request URL:', url.toString())
    console.log('Base URL:', API_CONFIG.baseUrl)
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    })
    
    const backendResult = await handleResponse<BackendResponse>(response)
    console.log('Backend Result:', backendResult)
    
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
    
    console.log('Transformed Result:', result)
    
    return result
  },

  async getChunkArtworks(params: { chunkX: number; chunkY: number; count?: number }): Promise<RandomArtworksResponse> {
    // Use the random endpoint with a deterministic seed based on chunk coordinates
    const seed = Math.abs(params.chunkX * 1000 + params.chunkY * 100)
    
    return this.getRandomArtworks({
      count: params.count || 20,
      seed: seed
    })
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

  async getSimilarArtworks(artworkId: number): Promise<SimilarityResponse> {
    const url = new URL(`${API_CONFIG.endpoints.similarArtworks}/${artworkId}`, API_CONFIG.baseUrl)
    
    console.log('Fetching similar artworks for ID:', artworkId, 'URL:', url.toString())
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('Similar artworks API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })
    
    const result = await handleResponse<SimilarityResponse>(response)
    console.log('Similar artworks result:', result)
    
    return result
  },
}
