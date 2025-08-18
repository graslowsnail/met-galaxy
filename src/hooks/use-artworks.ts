import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import type { Artwork } from '@/types/api'

interface UseRandomArtworksOptions {
  count?: number
  seed?: number
  enabled?: boolean
}

interface UseRandomArtworksResult {
  data: Artwork[] | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useRandomArtworks(options: UseRandomArtworksOptions = {}): UseRandomArtworksResult {
  const { count = 200, seed, enabled = true } = options
  const [data, setData] = useState<Artwork[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getRandomArtworks({ count, seed })
      setData(response.artworks)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch artworks'))
      console.error('Error fetching artworks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [count, seed, enabled])

  return {
    data,
    isLoading,
    error,
    refetch: () => void fetchData(),
  }
}

interface UseChunkArtworksOptions {
  chunkX: number
  chunkY: number
  count?: number
  enabled?: boolean
}

export function useChunkArtworks(options: UseChunkArtworksOptions): UseRandomArtworksResult {
  const { chunkX, chunkY, count = 20, enabled = true } = options
  const [data, setData] = useState<Artwork[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getChunkArtworks({ chunkX, chunkY, count })
      setData(response.artworks)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch chunk artworks'))
      console.error('Error fetching chunk artworks:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [chunkX, chunkY, count, enabled])

  return {
    data,
    isLoading,
    error,
    refetch: () => void fetchData(),
  }
}
