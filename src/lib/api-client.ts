import { API_CONFIG, type RandomArtworksResponse, type ArtworkCountResponse, type ErrorResponse } from '@/types/api'

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
    
    return handleResponse<RandomArtworksResponse>(response)
  },

  async getChunkArtworks(params: { chunkX: number; chunkY: number; count?: number }): Promise<RandomArtworksResponse> {
    const url = new URL(API_CONFIG.endpoints.chunkArtworks, API_CONFIG.baseUrl)
    
    url.searchParams.set('chunkX', params.chunkX.toString())
    url.searchParams.set('chunkY', params.chunkY.toString())
    
    if (params.count !== undefined) {
      url.searchParams.set('count', params.count.toString())
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    return handleResponse<RandomArtworksResponse>(response)
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
}
