/**
 * useChunkLoader - Data fetching and LRU caching
 * 
 * Handles deduped fetches for chunk coordinates with LRU cache management.
 * Integrates with existing API client for artwork data.
 */

import { useState, useCallback, useRef } from 'react'
import type { 
  UseChunkLoaderReturn, 
  ChunkData, 
  ChunkKey, 
  CacheEntry,
  ImageItem 
} from '../types/grid'
import { 
  MAX_DATA_CACHE, 
  API_TIMEOUT_MS, 
  DEBUG_LOGGING,
  CHUNK_SIZE 
} from '../utils/constants'

// Import existing API client
import { apiClient } from '@/lib/api-client'
import type { Artwork } from '@/types/api'

export function useChunkLoader(): UseChunkLoaderReturn {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [chunks] = useState<Map<ChunkKey, ChunkData>>(new Map())
  
  // ============================================================================
  // REFS FOR PERSISTENT STATE
  // ============================================================================
  
  // LRU cache for chunk data
  const cacheRef = useRef<Map<ChunkKey, CacheEntry<ChunkData>>>(new Map())
  
  // Track in-flight requests to prevent duplicates
  const loadingRef = useRef<Set<ChunkKey>>(new Set())
  
  // Cache statistics
  const statsRef = useRef({ hits: 0, misses: 0 })
  
  // ============================================================================
  // LRU CACHE MANAGEMENT
  // ============================================================================
  
  const updateLRU = useCallback((key: ChunkKey) => {
    const cache = cacheRef.current
    const entry = cache.get(key)
    
    if (entry) {
      // Move to end (most recently used)
      cache.delete(key)
      cache.set(key, { ...entry, timestamp: Date.now() })
    }
  }, [])
  
  const evictOldEntries = useCallback(() => {
    const cache = cacheRef.current
    
    while (cache.size >= MAX_DATA_CACHE) {
      // Remove least recently used (first entry)
      const firstKey = cache.keys().next().value
      if (firstKey) {
        cache.delete(firstKey)
        if (DEBUG_LOGGING) {
          console.log(`🗑️ LRU: Evicted chunk ${firstKey}`)
        }
      } else {
        break
      }
    }
  }, [])
  
  const addToCache = useCallback((key: ChunkKey, data: ChunkData) => {
    evictOldEntries()
    
    const entry: CacheEntry<ChunkData> = {
      value: data,
      timestamp: Date.now()
    }
    
    cacheRef.current.set(key, entry)
    
    if (DEBUG_LOGGING) {
      console.log(`💾 Cached chunk ${key}, cache size: ${cacheRef.current.size}`)
    }
  }, [evictOldEntries])
  
  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================
  
  const transformArtworkToImageItem = useCallback((
    artwork: Artwork, 
    chunkX: number, 
    chunkY: number, 
    localIndex: number
  ): ImageItem => {
    // Calculate aspect ratio - use deterministic aspect ratio based on artwork ID
    // In production, you'd want actual image dimensions from the API
    const hash = artwork.id % 7
    const ratios = [0.7, 0.8, 1.0, 1.2, 1.4, 0.6, 1.6]
    const aspectRatio = ratios[hash]
    
    // Use the image URL fields - the API client maps these to primaryImage/primaryImageSmall
    const imageUrl = artwork.primaryImageSmall ?? artwork.primaryImage ?? artwork.imageUrl ?? ''
    
    return {
      id: `${artwork.id}-${chunkX}-${chunkY}-${localIndex}`,
      src: imageUrl,
      aspectRatio,
      databaseId: artwork.id,
      objectId: artwork.objectId ?? 0,
      title: artwork.title ?? undefined,
      artist: artwork.artist ?? undefined,
      chunkX,
      chunkY,
      localIndex
    }
  }, [])
  
  // ============================================================================
  // CHUNK LOADING
  // ============================================================================
  
  const loadChunk = useCallback(async (x: number, y: number): Promise<ChunkData | null> => {
    const key: ChunkKey = `${x}:${y}`
    
    // Check cache first
    const cached = cacheRef.current.get(key)
    if (cached) {
      updateLRU(key)
      statsRef.current.hits++
      
      if (DEBUG_LOGGING) {
        console.log(`💾 Cache hit for chunk ${key}`)
      }
      
      return cached.value
    }
    
    statsRef.current.misses++
    
    // Check if already loading
    if (loadingRef.current.has(key)) {
      if (DEBUG_LOGGING) {
        console.log(`⏳ Chunk ${key} already loading, skipping duplicate request`)
      }
      return null
    }
    
    // Mark as loading
    loadingRef.current.add(key)
    
    try {
      if (DEBUG_LOGGING) {
        console.log(`📡 Loading chunk ${key}...`)
      }
      
      // Fetch artworks using existing API client
      const response = await apiClient.getChunkArtworks({
        chunkX: x,
        chunkY: y,
        count: CHUNK_SIZE
      })
      
      const artworks = response.artworks
      
      // Transform artworks to ImageItems with additional stability sorting
      const images: ImageItem[] = artworks
        .slice(0, CHUNK_SIZE)
        // Sort by database ID to ensure consistent ordering as a backup
        .sort((a, b) => a.id - b.id)
        .map((artwork, index) => 
          transformArtworkToImageItem(artwork, x, y, index)
        )
      
      // Create chunk data
      const chunkData: ChunkData = {
        id: key,
        x,
        y,
        images
      }
      
      // Add to cache
      addToCache(key, chunkData)
      
      if (DEBUG_LOGGING) {
        console.log(`✅ Loaded chunk ${key} with ${images.length} images`)
      }
      
      return chunkData
      
    } catch (error) {
      console.error(`❌ Failed to load chunk ${key}:`, error)
      return null
      
    } finally {
      // Remove from loading set
      loadingRef.current.delete(key)
    }
  }, [updateLRU, addToCache, transformArtworkToImageItem])
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const isLoading = useCallback((key: ChunkKey): boolean => {
    return loadingRef.current.has(key)
  }, [])
  
  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      hits: statsRef.current.hits,
      misses: statsRef.current.misses
    }
  }, [])
  
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    chunks.clear()
    loadingRef.current.clear()
    statsRef.current = { hits: 0, misses: 0 }
    
    if (DEBUG_LOGGING) {
      console.log('🧹 Chunk cache cleared')
    }
  }, [chunks])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    chunks,
    isLoading,
    loadChunk,
    getCacheStats,
    clearCache,
  }
}
