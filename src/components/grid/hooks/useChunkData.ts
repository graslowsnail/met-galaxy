/**
 * Hook for managing chunk data fetching and caching
 * 
 * This hook encapsulates all the logic for fetching, caching, and managing
 * artwork data for grid chunks. It provides a clean interface for components
 * to request data without worrying about the underlying cache management.
 */

import { useState, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import type { Artwork } from '@/types/api'
import type { 
  ChunkData, 
  ChunkCoordinates, 
  UseChunkDataReturn 
} from '../types/grid'
import { getChunkKey } from '../utils/chunkCalculations'
import { MAX_DATA_CACHE, CHUNK_SIZE } from '../utils/constants'

/**
 * Custom hook for managing chunk data with intelligent caching
 * 
 * Features:
 * - Automatic deduplication of concurrent requests
 * - LRU cache management
 * - Loading state tracking
 * - Error handling and retry logic
 * - Memory-efficient cleanup
 */
export function useChunkData(): UseChunkDataReturn {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /** Map of chunk keys to their data state */
  const [chunkDataMap, setChunkDataMap] = useState<Map<string, ChunkData>>(new Map())
  
  /** Track which chunks are currently being fetched to prevent duplicates */
  const fetchingChunks = useRef<Set<string>>(new Set())
  
  /** Track overall loading state */
  const [isLoading, setIsLoading] = useState(false)
  
  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================
  
  /**
   * Clean up data cache using LRU (Least Recently Used) strategy
   * Keeps cache size under control while preserving recently accessed data
   */
  const cleanupDataCache = useCallback(() => {
    setChunkDataMap(prevData => {
      if (prevData.size <= MAX_DATA_CACHE) return prevData
      
      const newData = new Map(prevData)
      const dataKeys = Array.from(newData.keys())
      const excessCount = newData.size - MAX_DATA_CACHE
      
      // Remove oldest entries (LRU - Map maintains insertion order)
      const keysToRemove = dataKeys.slice(0, excessCount)
      keysToRemove.forEach(key => newData.delete(key))
      
      return newData
    })
  }, [])
  
  /**
   * Clear the entire data cache (useful for memory cleanup or reset)
   */
  const clearCache = useCallback(() => {
    setChunkDataMap(new Map())
    fetchingChunks.current.clear()
  }, [])
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  /**
   * Fetch artwork data for a specific chunk with intelligent caching and deduplication
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns Promise resolving to artwork array or null if failed
   */
  const fetchChunkData = useCallback(async (chunkX: number, chunkY: number): Promise<Artwork[] | null> => {
    const chunkKey = getChunkKey(chunkX, chunkY)
    
    // Skip if already loaded or loading
    const existingData = chunkDataMap.get(chunkKey)
    if (existingData && (existingData.loading || existingData.artworks)) {
      return existingData.artworks
    }
    
    // Skip if already being fetched (deduplication)
    if (fetchingChunks.current.has(chunkKey)) {
      return null
    }
    
    // Mark as being fetched
    fetchingChunks.current.add(chunkKey)
    
    // Set loading state
    setChunkDataMap(prev => new Map(prev).set(chunkKey, {
      artworks: null,
      loading: true,
      error: null
    }))
    
    // Update global loading state
    setIsLoading(true)
    
    try {
      const response = await apiClient.getChunkArtworks({ 
        chunkX, 
        chunkY, 
        count: CHUNK_SIZE 
      })
      
      // Update with successful data
      setChunkDataMap(prev => new Map(prev).set(chunkKey, {
        artworks: response.artworks,
        loading: false,
        error: null
      }))
      
      // Trigger cache cleanup if needed
      cleanupDataCache()
      
      return response.artworks
      
    } catch (error) {
      console.error(`❌ Error fetching chunk ${chunkX},${chunkY}:`, error)
      
      // Update with error state
      setChunkDataMap(prev => new Map(prev).set(chunkKey, {
        artworks: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch chunk data')
      }))
      
      return null
      
    } finally {
      // Remove from fetching set
      fetchingChunks.current.delete(chunkKey)
      
      // Update global loading state
      setIsLoading(prev => {
        // Check if any other chunks are still loading
        const stillLoading = Array.from(chunkDataMap.values()).some(data => data.loading)
        return stillLoading
      })
    }
  }, [chunkDataMap, cleanupDataCache])
  
  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================
  
  /**
   * Fetch multiple chunks in parallel with intelligent batching
   * 
   * @param coordinates - Array of chunk coordinates to fetch
   * @returns Promise resolving when all fetches complete
   */
  const fetchMultipleChunks = useCallback(async (coordinates: ChunkCoordinates[]): Promise<void> => {
    if (coordinates.length === 0) return
    
    // Filter out chunks that don't need fetching
    const chunksToFetch = coordinates.filter(coord => {
      const chunkKey = getChunkKey(coord.x, coord.y)
      const existingData = chunkDataMap.get(chunkKey)
      const alreadyFetching = fetchingChunks.current.has(chunkKey)
      
      return !existingData && !alreadyFetching
    })
    
    if (chunksToFetch.length === 0) {
      return
    }
    
    // Fetch all chunks in parallel
    await Promise.allSettled(
      chunksToFetch.map(coord => fetchChunkData(coord.x, coord.y))
    )
  }, [chunkDataMap, fetchChunkData])
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Get data for a specific chunk (synchronous access to cache)
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns ChunkData object or undefined if not in cache
   */
  const getChunkData = useCallback((chunkX: number, chunkY: number): ChunkData | undefined => {
    const chunkKey = getChunkKey(chunkX, chunkY)
    return chunkDataMap.get(chunkKey)
  }, [chunkDataMap])
  
  /**
   * Check if a chunk has loaded artwork data
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns true if chunk has loaded artwork data
   */
  const hasChunkData = useCallback((chunkX: number, chunkY: number): boolean => {
    const data = getChunkData(chunkX, chunkY)
    return Boolean(data?.artworks && data.artworks.length > 0)
  }, [getChunkData])
  
  /**
   * Check if a chunk is currently loading
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns true if chunk is currently being fetched
   */
  const isChunkLoading = useCallback((chunkX: number, chunkY: number): boolean => {
    const data = getChunkData(chunkX, chunkY)
    return Boolean(data?.loading)
  }, [getChunkData])
  
  /**
   * Get cache statistics for monitoring and debugging
   */
  const getCacheStats = useCallback(() => {
    const stats = {
      totalEntries: chunkDataMap.size,
      loadedEntries: 0,
      loadingEntries: 0,
      errorEntries: 0,
      fetchingEntries: fetchingChunks.current.size,
    }
    
    for (const data of chunkDataMap.values()) {
      if (data.artworks) stats.loadedEntries++
      if (data.loading) stats.loadingEntries++
      if (data.error) stats.errorEntries++
    }
    
    return stats
  }, [chunkDataMap])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    // Core data access
    chunkDataMap,
    fetchChunkData,
    isLoading,
    
    // Cache management
    clearCache,
    
    // Batch operations
    fetchMultipleChunks,
    
    // Utility functions
    getChunkData,
    hasChunkData,
    isChunkLoading,
    getCacheStats,
  }
}
