import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import type { SimilarityResponse } from '@/types/api'

interface UseSimilarArtworksOptions {
  artworkId: number | null
  enabled?: boolean
}

interface UseSimilarArtworksResult {
  data: SimilarityResponse | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useSimilarArtworks(options: UseSimilarArtworksOptions): UseSimilarArtworksResult {
  const { artworkId, enabled = true } = options
  const [data, setData] = useState<SimilarityResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!artworkId || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Fetching similar artworks for artwork ID:', artworkId)
      const response = await apiClient.getSimilarArtworks(artworkId)
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch similar artworks'))
      console.error('Error fetching similar artworks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [artworkId, enabled])

  return {
    data,
    isLoading,
    error,
    refetch: () => void fetchData(),
  }
}
