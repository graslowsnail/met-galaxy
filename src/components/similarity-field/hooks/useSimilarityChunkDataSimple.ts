/**
 * Simple Hook for managing similarity chunk data with streaming support
 * 
 * This version implements progressive loading like the draggable grid while
 * maintaining reasonable deduplication for similarity context. It prioritizes
 * user experience (fast loading) over perfect deduplication.
 */

import { useState, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import type { Artwork, FieldChunkItem, MultiChunkResponse } from '@/types/api'
import type { 
  ChunkData, 
  ChunkCoordinates, 
  UseChunkDataReturn 
} from '../../grid-legacy/grid/types/grid'
import { getChunkKey } from '../../grid-legacy/grid/utils/chunkCalculations'
import { MAX_DATA_CACHE, CHUNK_SIZE, DEBUG_LOGGING } from '../utils/constants'

interface UseSimilarityChunkDataProps {
  focalArtworkId: number
  focalArtwork?: {
    id: number
    title: string | null
    artist: string | null
    imageUrl: string | null
    originalImageUrl: string | null
  }
}

// Extend the return type to include streaming fetch
interface UseSimilarityChunkDataReturn extends UseChunkDataReturn {
  fetchMultipleChunksStreaming: (coordinates: ChunkCoordinates[], priority?: 'high' | 'low') => Promise<void>
  fetchMultipleChunksWithDeduplication: (coordinates: ChunkCoordinates[]) => Promise<void>
}

/**
 * Custom hook for managing similarity chunk data with streaming support
 * 
 * Features:
 * - Uses field-chunk API for all chunks except focal (0,0) 
 * - Implements streaming/progressive loading like draggable grid
 * - Optimistic deduplication that doesn't block loading
 * - Priority-based fetching with delays for low priority chunks
 */
export function useSimilarityChunkDataSimple({
  focalArtworkId,
  focalArtwork
}: UseSimilarityChunkDataProps): UseSimilarityChunkDataReturn {
  // ============================================================================
  // STATE MANAGEMENT - Same as before + optimistic deduplication
  // ============================================================================
  
  /** Map of chunk keys to their data state */
  const [chunkDataMap, setChunkDataMap] = useState<Map<string, ChunkData>>(new Map())
  
  /** Track which chunks are currently being fetched to prevent duplicates */
  const fetchingChunks = useRef<Set<string>>(new Set())
  
  /** Track overall loading state */
  const [isLoading, setIsLoading] = useState(false)
  
  /** 
   * Optimistic deduplication tracking - we update this immediately when
   * starting a fetch, not waiting for completion
   */
  const usedArtworkIds = useRef<Set<number>>(new Set())
  
  /** Reserved artwork IDs that are being fetched (optimistic) */
  const reservedArtworkIds = useRef<Set<number>>(new Set())
  
  /** Track when focal artwork ID changes to reset deduplication */
  const lastFocalId = useRef<number>(focalArtworkId)
  
  // ============================================================================
  // CACHE MANAGEMENT - Same as before
  // ============================================================================
  
  /**
   * Clean up data cache using LRU (Least Recently Used) strategy
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
      
      if (DEBUG_LOGGING) {
        console.log(`💾 Similarity data cache cleanup: removed ${keysToRemove.length} entries, keeping ${newData.size}`)
      }
      
      return newData
    })
  }, [])
  
  /**
   * Clear the entire data cache and reset deduplication
   */
  const clearCache = useCallback(() => {
    setChunkDataMap(new Map())
    fetchingChunks.current.clear()
    usedArtworkIds.current.clear()
    reservedArtworkIds.current.clear()
    lastFocalId.current = focalArtworkId
    
    if (DEBUG_LOGGING) {
      console.log('🧹 Similarity data cache cleared completely and deduplication reset')
    }
  }, [focalArtworkId])
  
  // ============================================================================
  // DATA FETCHING - Modified for streaming
  // ============================================================================
  
  /**
   * Fetch artwork data for a specific chunk with optimistic deduplication
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns Promise resolving to artwork array or null if failed
   */
  const fetchChunkData = useCallback(async (chunkX: number, chunkY: number): Promise<Artwork[] | null> => {
    const chunkKey = getChunkKey(chunkX, chunkY)
    
    // Reset everything if focal artwork changed
    if (lastFocalId.current !== focalArtworkId) {
      if (DEBUG_LOGGING) {
        console.log(`🔄 Focal artwork changed from ${lastFocalId.current} to ${focalArtworkId}, clearing all caches`)
      }
      // Clear all data caches for fresh start
      setChunkDataMap(new Map())
      fetchingChunks.current.clear()
      usedArtworkIds.current.clear()
      reservedArtworkIds.current.clear()
      lastFocalId.current = focalArtworkId
    }
    
    // Skip if already loaded or loading
    const existingData = chunkDataMap.get(chunkKey)
    if (existingData && (existingData.loading || existingData.artworks)) {
      if (DEBUG_LOGGING) {
        console.log(`Similarity chunk ${chunkKey} already has data, skipping fetch`)
      }
      return existingData.artworks
    }
    
    // Skip if already being fetched (deduplication)
    if (fetchingChunks.current.has(chunkKey)) {
      if (DEBUG_LOGGING) {
        console.log(`Similarity chunk ${chunkKey} already being fetched, skipping duplicate`)
      }
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
      let artworks: Artwork[] = []
      
      // Handle focal chunk (0,0) - display the focal image
      if (chunkX === 0 && chunkY === 0) {
        if (DEBUG_LOGGING) {
          console.log(`🎯 Creating focal chunk ${chunkKey} with focal artwork ${focalArtworkId}`)
        }
        
        if (focalArtwork) {
          // Transform focal artwork to match Artwork interface
          artworks = [{
            id: focalArtwork.id,
            objectId: focalArtwork.id, // Use same ID for objectId
            title: focalArtwork.title,
            artist: focalArtwork.artist,
            date: null,
            imageUrl: focalArtwork.imageUrl,
            originalImageUrl: focalArtwork.originalImageUrl || focalArtwork.imageUrl,
            imageSource: 's3',
            department: null,
            culture: null,
            medium: null,
            primaryImage: focalArtwork.imageUrl,
            primaryImageSmall: focalArtwork.imageUrl
          }]
        } else {
          if (DEBUG_LOGGING) {
            console.log(`⚠️ No focal artwork provided for focal chunk`)
          }
          artworks = []
        }
        
        // Add focal artwork ID to used set
        if (focalArtwork) {
          usedArtworkIds.current.add(focalArtwork.id)
        }
      } 
      // Handle all other chunks - use field-chunk API with optimistic deduplication
      else {
        // Combine used and reserved IDs for exclusion
        const excludeIds = Array.from(new Set([
          ...Array.from(usedArtworkIds.current),
          ...Array.from(reservedArtworkIds.current)
        ]))
        
        if (DEBUG_LOGGING) {
          console.log(`🌍 Fetching field-chunk data for chunk ${chunkX},${chunkY} with target ${focalArtworkId}, excluding ${excludeIds.length} IDs`)
        }
        
        const response = await apiClient.fetchFieldChunk({
          targetId: focalArtworkId,
          chunkX,
          chunkY,
          count: CHUNK_SIZE,
          excludeIds: excludeIds
        })
        
        // Transform FieldChunkItem to Artwork format
        artworks = response.data.map((item: FieldChunkItem) => ({
          id: item.id,
          objectId: item.objectId,
          title: item.title,
          artist: item.artist,
          date: null,
          imageUrl: item.imageUrl,
          originalImageUrl: item.originalImageUrl || item.imageUrl,
          imageSource: item.imageSource,
          department: null,
          culture: null,
          medium: null,
          primaryImage: item.imageUrl,
          primaryImageSmall: item.imageUrl
        }))
        
        // Add fetched artwork IDs to used set and remove from reserved
        artworks.forEach(artwork => {
          usedArtworkIds.current.add(artwork.id)
          reservedArtworkIds.current.delete(artwork.id)
        })
        
        if (DEBUG_LOGGING) {
          console.log(`✅ Loaded ${artworks.length} artworks for similarity chunk ${chunkX},${chunkY}`)
          console.log(`📊 Total unique artworks: ${usedArtworkIds.current.size} used, ${reservedArtworkIds.current.size} reserved`)
        }
      }
      
      // Update with successful data
      setChunkDataMap(prev => new Map(prev).set(chunkKey, {
        artworks: artworks,
        loading: false,
        error: null
      }))
      
      // Trigger cache cleanup if needed
      cleanupDataCache()
      
      return artworks
      
    } catch (error) {
      console.error(`❌ Error fetching similarity chunk ${chunkX},${chunkY}:`, error)
      
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
  }, [chunkDataMap, focalArtworkId, focalArtwork, cleanupDataCache])
  
  // ============================================================================
  // STREAMING OPERATIONS - New for progressive loading
  // ============================================================================
  
  /**
   * Fetch multiple chunks with streaming (non-blocking) approach
   * This allows individual chunks to render as soon as they're loaded
   * 
   * @param coordinates - Array of chunk coordinates to fetch
   * @param priority - Priority level for these chunks ('high' for visible, 'low' for buffer)
   * @returns Promise resolving immediately (doesn't wait for all fetches)
   */
  const fetchMultipleChunksStreaming = useCallback(async (
    coordinates: ChunkCoordinates[], 
    priority: 'high' | 'low' = 'high'
  ): Promise<void> => {
    if (coordinates.length === 0) return
    
    if (DEBUG_LOGGING) {
      console.log(`📦 Streaming fetch for ${coordinates.length} similarity chunks (${priority} priority):`, 
        coordinates.map(c => `(${c.x},${c.y})`).join(', '))
    }
    
    // Filter out chunks that don't need fetching
    const chunksToFetch = coordinates.filter(coord => {
      const chunkKey = getChunkKey(coord.x, coord.y)
      const existingData = chunkDataMap.get(chunkKey)
      const alreadyFetching = fetchingChunks.current.has(chunkKey)
      
      return !existingData && !alreadyFetching
    })
    
    if (chunksToFetch.length === 0) {
      if (DEBUG_LOGGING) {
        console.log('No chunks need fetching - all already loaded or loading')
      }
      return
    }
    
    // Optimistically reserve IDs for chunks we're about to fetch
    // This helps reduce duplicates even with parallel fetching
    const estimatedArtworksPerChunk = CHUNK_SIZE
    const totalExpectedArtworks = chunksToFetch.length * estimatedArtworksPerChunk
    
    // Reserve a range of IDs (this is a rough estimate)
    const startReservedId = Math.max(...Array.from(usedArtworkIds.current), 0) + 1
    for (let i = 0; i < totalExpectedArtworks; i++) {
      reservedArtworkIds.current.add(startReservedId + i)
    }
    
    // Start all chunks immediately without waiting (streaming approach)
    // Higher priority chunks get fetched first by sorting
    const sortedChunks = priority === 'high' 
      ? chunksToFetch  // High priority: fetch in order
      : [...chunksToFetch].reverse()  // Low priority: reverse order
    
    // Fire and forget - don't await the individual fetches
    sortedChunks.forEach((coord, index) => {
      // Add small delay for low priority chunks to not overwhelm the API
      const delay = priority === 'low' ? index * 50 : 0
      
      if (delay > 0) {
        setTimeout(() => {
          fetchChunkData(coord.x, coord.y).catch(error => {
            console.warn(`Failed to fetch chunk ${coord.x},${coord.y}:`, error)
          })
        }, delay)
      } else {
        fetchChunkData(coord.x, coord.y).catch(error => {
          console.warn(`Failed to fetch chunk ${coord.x},${coord.y}:`, error)
        })
      }
    })
    
    if (DEBUG_LOGGING) {
      console.log(`🚀 Started streaming fetch for ${chunksToFetch.length} chunks`)
    }
  }, [chunkDataMap, fetchChunkData])

  /**
   * Fetch multiple chunks with perfect deduplication using the new multi-chunk API
   * 
   * @param coordinates - Array of chunk coordinates to fetch
   * @returns Promise resolving when all chunks are processed
   */
  const fetchMultipleChunksWithDeduplication = useCallback(async (
    coordinates: ChunkCoordinates[]
  ): Promise<void> => {
    if (coordinates.length === 0) return
    
    if (DEBUG_LOGGING) {
      console.log(`📦 Multi-chunk deduplication fetch for ${coordinates.length} chunks:`, 
        coordinates.map(c => `(${c.x},${c.y})`).join(', '))
    }
    
    // Filter out chunks that don't need fetching
    const chunksToFetch = coordinates.filter(coord => {
      const chunkKey = getChunkKey(coord.x, coord.y)
      const existingData = chunkDataMap.get(chunkKey)
      const alreadyFetching = fetchingChunks.current.has(chunkKey)
      
      return !existingData && !alreadyFetching
    })
    
    if (chunksToFetch.length === 0) {
      if (DEBUG_LOGGING) {
        console.log('No chunks need fetching - all already loaded or loading')
      }
      return
    }
    
    // Mark all chunks as loading
    const chunkKeys = chunksToFetch.map(coord => getChunkKey(coord.x, coord.y))
    chunkKeys.forEach(key => fetchingChunks.current.add(key))
    
    // Set loading states
    setChunkDataMap(prev => {
      const updated = new Map(prev)
      chunkKeys.forEach(key => {
        updated.set(key, { artworks: null, loading: true, error: null })
      })
      return updated
    })
    
    setIsLoading(true)
    
    try {
      // Get current exclude list
      const excludeIds = Array.from(usedArtworkIds.current)
      
      // Call multi-chunk API
      const response = await apiClient.fetchMultipleChunks({
        targetId: focalArtworkId,
        chunks: chunksToFetch,
        count: CHUNK_SIZE,
        excludeIds: excludeIds
      })
      
      if (DEBUG_LOGGING) {
        console.log(`✅ Multi-chunk response:`, response.meta)
      }
      
      // Process each chunk's data
      const updatedChunks = new Map<string, ChunkData>()
      
      for (const [chunkKey, chunkData] of Object.entries(response.data)) {
        // Transform FieldChunkItem to Artwork format
        const artworks: Artwork[] = chunkData.artworks.map((item: FieldChunkItem) => ({
          id: item.id,
          objectId: item.objectId,
          title: item.title,
          artist: item.artist,
          date: null,
          imageUrl: item.imageUrl,
          originalImageUrl: item.originalImageUrl || item.imageUrl,
          imageSource: item.imageSource,
          department: null,
          culture: null,
          medium: null,
          primaryImage: item.imageUrl,
          primaryImageSmall: item.imageUrl
        }))
        
        // Add all artwork IDs to used set
        artworks.forEach(artwork => {
          usedArtworkIds.current.add(artwork.id)
        })
        
        // Store chunk data
        updatedChunks.set(chunkKey, {
          artworks: artworks,
          loading: false,
          error: null
        })
        
        if (DEBUG_LOGGING) {
          console.log(`📦 Processed chunk ${chunkKey}: ${artworks.length} artworks`)
        }
      }
      
      // Update all chunks at once
      setChunkDataMap(prev => {
        const updated = new Map(prev)
        for (const [key, data] of updatedChunks) {
          updated.set(key, data)
        }
        return updated
      })
      
      if (DEBUG_LOGGING) {
        console.log(`✅ Multi-chunk fetch complete: ${updatedChunks.size} chunks, ${usedArtworkIds.current.size} total unique artworks`)
      }
      
    } catch (error) {
      console.error(`❌ Error in multi-chunk fetch:`, error)
      
      // Set error state for all chunks
      setChunkDataMap(prev => {
        const updated = new Map(prev)
        chunkKeys.forEach(key => {
          updated.set(key, {
            artworks: null,
            loading: false,
            error: error instanceof Error ? error : new Error('Multi-chunk fetch failed')
          })
        })
        return updated
      })
      
    } finally {
      // Remove all from fetching set
      chunkKeys.forEach(key => fetchingChunks.current.delete(key))
      
      // Update global loading state
      setIsLoading(prev => {
        const stillLoading = Array.from(chunkDataMap.values()).some(data => data.loading)
        return stillLoading
      })
      
      // Trigger cache cleanup if needed
      cleanupDataCache()
    }
  }, [chunkDataMap, focalArtworkId, cleanupDataCache])
  
  // ============================================================================
  // BATCH OPERATIONS - Legacy support
  // ============================================================================
  
  /**
   * Fetch multiple chunks in parallel (legacy method - waits for all)
   * Prefer fetchMultipleChunksStreaming for better performance
   */
  const fetchMultipleChunks = useCallback(async (coordinates: ChunkCoordinates[]): Promise<void> => {
    if (coordinates.length === 0) return
    
    if (DEBUG_LOGGING) {
      console.log(`📦 Fetching ${coordinates.length} similarity chunks in parallel:`, 
        coordinates.map(c => `(${c.x},${c.y})`).join(', '))
    }
    
    // Filter out chunks that don't need fetching
    const chunksToFetch = coordinates.filter(coord => {
      const chunkKey = getChunkKey(coord.x, coord.y)
      const existingData = chunkDataMap.get(chunkKey)
      const alreadyFetching = fetchingChunks.current.has(chunkKey)
      
      return !existingData && !alreadyFetching
    })
    
    if (chunksToFetch.length === 0) {
      if (DEBUG_LOGGING) {
        console.log('No similarity chunks need fetching - all already loaded or loading')
      }
      return
    }
    
    // Fetch all chunks in parallel
    await Promise.allSettled(
      chunksToFetch.map(coord => fetchChunkData(coord.x, coord.y))
    )
    
    if (DEBUG_LOGGING) {
      console.log(`✅ Batch fetch complete for ${chunksToFetch.length} similarity chunks`)
    }
  }, [chunkDataMap, fetchChunkData])
  
  // ============================================================================
  // UTILITY FUNCTIONS - Same as before
  // ============================================================================
  
  /**
   * Get data for a specific chunk (synchronous access to cache)
   */
  const getChunkData = useCallback((chunkX: number, chunkY: number): ChunkData | undefined => {
    const chunkKey = getChunkKey(chunkX, chunkY)
    return chunkDataMap.get(chunkKey)
  }, [chunkDataMap])
  
  /**
   * Check if a chunk has loaded artwork data
   */
  const hasChunkData = useCallback((chunkX: number, chunkY: number): boolean => {
    const data = getChunkData(chunkX, chunkY)
    return Boolean(data?.artworks && data.artworks.length > 0)
  }, [getChunkData])
  
  /**
   * Check if a chunk is currently loading
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
      uniqueArtworks: usedArtworkIds.current.size,
      reservedIds: reservedArtworkIds.current.size
    }
    
    for (const data of chunkDataMap.values()) {
      if (data.artworks) stats.loadedEntries++
      if (data.loading) stats.loadingEntries++
      if (data.error) stats.errorEntries++
    }
    
    return stats
  }, [chunkDataMap])
  
  // ============================================================================
  // RETURN INTERFACE - Extended with streaming support
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
    
    // Streaming operations (new)
    fetchMultipleChunksStreaming,
    
    // Deduplication operations (newest)
    fetchMultipleChunksWithDeduplication,
    
    // Legacy compatibility methods (for UseChunkDataReturn interface)
    fetchChunkStreaming: async (chunkX: number, chunkY: number, priority: 'high' | 'low' = 'high') => {
      // Use existing fetchChunkData for compatibility
      await fetchChunkData(chunkX, chunkY)
    },
    fetchChunksWithPriority: async (visibleChunks: ChunkCoordinates[], bufferChunks?: ChunkCoordinates[]) => {
      // Use existing batch methods for compatibility
      const allCoords = [...visibleChunks, ...(bufferChunks || [])]
      await fetchMultipleChunksStreaming(allCoords, 'high')
    },
    
    // Utility functions
    getChunkData,
    hasChunkData,
    isChunkLoading,
    getCacheStats,
  }
}