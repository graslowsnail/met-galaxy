/**
 * Hook for managing similarity chunk data
 * 
 * Handles the loading, caching, and management of chunks specifically
 * for the similarity grid system. Creates chunks with focal images,
 * similar images, and random filler images.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import type { 
  SimilarityChunk, 
  SimilarityChunkData,
  SimilarityData
} from '../types/similarity'
import type { SimilarArtwork } from '@/types/api'
import { 
  createFocalChunk, 
  createSimilarityChunk,
  getVisibleChunks
} from '../utils/chunkCalculations'
import { 
  MAX_DATA_CACHE,
  DEBUG_LOGGING,
  CHUNK_POSITIONS
} from '../utils/constants'

interface UseSimilarityChunkDataProps {
  currentFocalId: number
  similarityData: SimilarityData | null
}

interface UseSimilarityChunkDataReturn {
  chunks: Map<string, SimilarityChunk>
  loadingChunks: Set<string>
  errorChunks: Map<string, Error>
  loadChunk: (chunkId: string) => Promise<SimilarityChunk>
  clearCache: () => void
  refreshData: () => void
}

export function useSimilarityChunkData({
  currentFocalId,
  similarityData
}: UseSimilarityChunkDataProps): UseSimilarityChunkDataReturn {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [chunks] = useState<Map<string, SimilarityChunk>>(new Map())
  const [loadingChunks] = useState<Set<string>>(new Set())
  const [errorChunks] = useState<Map<string, Error>>(new Map())
  
  // Track last focal ID for cache invalidation
  const lastFocalId = useRef<number | null>(null)
  
  // In-flight request tracking for abort control
  const inflightRequests = useRef<Map<string, AbortController>>(new Map())
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  // ============================================================================
  // CHUNK CREATION
  // ============================================================================
  
  /**
   * Load or create a specific chunk
   */
  const loadChunk = useCallback(async (chunkId: string): Promise<SimilarityChunk> => {
    // Check if chunk already exists
    const existingChunk = chunks.get(chunkId)
    if (existingChunk) {
      return existingChunk
    }
    
    // Check if already loading
    if (loadingChunks.has(chunkId)) {
      // Wait for existing load to complete
      return new Promise((resolve, reject) => {
        const checkComplete = () => {
          const chunk = chunks.get(chunkId)
          const error = errorChunks.get(chunkId)
          
          if (chunk) {
            resolve(chunk)
          } else if (error) {
            reject(error)
          } else if (loadingChunks.has(chunkId)) {
            // Still loading, check again
            setTimeout(checkComplete, 100)
          } else {
            reject(new Error('Chunk load cancelled'))
          }
        }
        checkComplete()
      })
    }
    
    // Mark as loading
    loadingChunks.add(chunkId)
    errorChunks.delete(chunkId)
    
    try {
      // Parse new format: "targetId:chunkX,chunkY"
      const parts = chunkId.split(':')
      if (parts.length !== 2) {
        throw new Error(`Invalid chunk ID format: ${chunkId} (expected targetId:chunkX,chunkY)`)
      }
      const coords = parts[1]?.split(',').map(Number) ?? []
      if (coords.length !== 2 || isNaN(coords[0]!) || isNaN(coords[1]!)) {
        throw new Error(`Invalid chunk ID format: ${chunkId} (invalid coordinates)`)
      }
      const chunkX = coords[0]!
      const chunkY = coords[1]!
      let chunk: SimilarityChunk
      
      // Create focal chunk (0,0)
      if (chunkX === 0 && chunkY === 0) {
        if (!similarityData?.similarArtworks) {
          throw new Error('No similarity data available for focal chunk')
        }
        
        const focalArtwork = similarityData.similarArtworks.find(artwork => artwork.isOriginal)
        if (!focalArtwork) {
          throw new Error('No focal artwork found in similarity data')
        }
        
        // Transform the focal artwork for createFocalChunk
        const transformedFocalArtwork: SimilarArtwork = {
          id: focalArtwork.id,
          objectId: focalArtwork.id,
          title: focalArtwork.title,
          artist: focalArtwork.artist,
          imageUrl: focalArtwork.imageUrl,
          originalImageUrl: focalArtwork.imageUrl,
          imageSource: "s3" as const,
          original: focalArtwork.isOriginal,
          similarity: focalArtwork.similarity
        }
        
        chunk = createFocalChunk(transformedFocalArtwork, currentFocalId)
        
        if (DEBUG_LOGGING) {
          console.log(`🎯 Created focal chunk: ${chunk.id}`)
        }
      }
      // Create similarity chunks
      else {
        // Use field-chunk endpoint for ALL chunks - backend handles deduplication
        // Cancel any existing request for this chunk
        const existingController = inflightRequests.current.get(chunkId)
        if (existingController) {
          existingController.abort()
        }
        
        // Create new abort controller
        const controller = new AbortController()
        inflightRequests.current.set(chunkId, controller)
        
        try {
            if (DEBUG_LOGGING) {
              console.log(`🌍 Using field-chunk API for chunk ${chunkId} (${chunkX}, ${chunkY})`)
            }
            
            const fieldResponse = await apiClient.fetchFieldChunk({
              targetId: currentFocalId,
              chunkX,
              chunkY,
              count: 20,
              signal: controller.signal
            })
            
            // Transform field chunk items to similarity format
            const fieldArtworks = fieldResponse.data.map(item => ({
              id: item.id,
              objectId: item.objectId,
              title: item.title ?? 'Untitled',
              artist: item.artist ?? 'Unknown',
              date: null,
              imageUrl: item.imageUrl ?? '',
              originalImageUrl: item.originalImageUrl,
              imageSource: item.imageSource ?? 's3',
              department: null,
              culture: null,
              medium: null,
              original: false,
              similarity: item.similarity ?? 0
            }))
            
            chunk = createSimilarityChunk(
              chunkX,
              chunkY,
              [], // No predefined similar artworks for field chunks
              fieldArtworks, // Use field response as "random" artworks
              currentFocalId
            )
            
            // Clean up inflight request
            inflightRequests.current.delete(chunkId)
            
            if (DEBUG_LOGGING) {
              console.log(`🌍 Created field chunk ${chunk.id}: ${chunk.images.length} images from field API (t=${fieldResponse.meta.t.toFixed(3)}, weights: sim=${fieldResponse.meta.weights.sim.toFixed(2)}, drift=${fieldResponse.meta.weights.drift.toFixed(2)}, rand=${fieldResponse.meta.weights.rand.toFixed(2)})`)
            }
          } catch (error) {
            // Clean up inflight request on error
            inflightRequests.current.delete(chunkId)
            
            // Don't fallback if the request was aborted (user navigated away)
            if ((error as Error).name === 'AbortError') {
              throw error
            }
            
            console.warn(`⚠️ Field-chunk API failed for ${chunkId}, falling back to traditional method:`, error)
            
            // Fallback to original random artwork approach
            const randomResponse = await apiClient.getChunkArtworks({
              chunkX,
              chunkY,
              count: 20
            })
            
            chunk = createSimilarityChunk(
              chunkX,
              chunkY,
              [], // No similar artworks for fallback
              randomResponse.artworks || [],
              currentFocalId
            )
          }
      }
      
      // Store chunk
      chunks.set(chunkId, chunk)
      
      // Manage cache size
      if (chunks.size > MAX_DATA_CACHE) {
        const oldestChunkId = chunks.keys().next().value
        if (oldestChunkId && oldestChunkId !== chunkId) {
          chunks.delete(oldestChunkId)
          
          if (DEBUG_LOGGING) {
            console.log(`🗑️ Removed old chunk from cache: ${oldestChunkId}`)
          }
        }
      }
      
      return chunk
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load chunk')
      errorChunks.set(chunkId, err)
      
      console.error(`❌ Error loading chunk ${chunkId}:`, err)
      throw err
      
    } finally {
      loadingChunks.delete(chunkId)
    }
  }, [chunks, loadingChunks, errorChunks, similarityData, currentFocalId])
  
  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================
  
  /**
   * Clear all cached chunks
   */
  const clearCache = useCallback(() => {
    chunks.clear()
    loadingChunks.clear()
    errorChunks.clear()
    lastFocalId.current = null
    
    // Cancel all inflight requests
    for (const controller of inflightRequests.current.values()) {
      try {
        controller.abort()
      } catch (error) {
        // Ignore AbortErrors during cleanup
        if ((error as Error).name !== 'AbortError') {
          console.warn('Error aborting request during cleanup:', error)
        }
      }
    }
    inflightRequests.current.clear()
    
    if (DEBUG_LOGGING) {
      console.log('🧹 Cleared similarity chunk cache')
    }
  }, [chunks, loadingChunks, errorChunks])
  
  /**
   * Refresh data when focal image changes
   */
  const refreshData = useCallback(() => {
    clearCache()
    
    if (DEBUG_LOGGING) {
      console.log(`🔄 Refreshing similarity data for focal ID: ${currentFocalId}`)
    }
  }, [clearCache, currentFocalId])
  
  // ============================================================================
  // INITIAL CHUNK PRELOADING
  // ============================================================================
  
  /**
   * Preload essential chunks around the focal chunk on initial load
   * Additional chunks will be loaded on-demand via viewport-based virtualization
   */
  useEffect(() => {
    if (!similarityData) {
      if (DEBUG_LOGGING) {
        console.log(`⏸️ Skipping initial chunk preload - similarity data not available`)
      }
      return
    }
    
    const preloadInitialChunks = async () => {
      // Always load focal chunk first
      try {
        await loadChunk(`${currentFocalId}:0,0`)
        if (DEBUG_LOGGING) {
          console.log(`✅ Successfully loaded focal chunk`)
        }
      } catch (error) {
        console.error('Failed to load focal chunk:', error)
        return
      }
      
      // Preload ring 1 chunks (immediately around focal with similarity)
      const ring1Positions = CHUNK_POSITIONS.RING_1
      for (const pos of ring1Positions) {
        const chunkId = `${currentFocalId}:${pos.x},${pos.y}`
        try {
          loadChunk(chunkId) // Don't await - load in parallel
        } catch (error) {
          console.warn(`Failed to preload chunk ${chunkId}:`, error)
        }
      }
      
      if (DEBUG_LOGGING) {
        console.log(`🚀 Preloading ${ring1Positions.length + 1} initial chunks around focal image`)
        console.log(`   Focal: 1 chunk`)
        console.log(`   Ring 1: ${ring1Positions.length} chunks (similarity)`)
        console.log(`   Additional chunks will be loaded on-demand via viewport visibility`)
      }
    }
    
    preloadInitialChunks()
  }, [similarityData, currentFocalId, loadChunk])
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  /**
   * Clear cache when focal image changes
   */
  useEffect(() => {
    if (lastFocalId.current !== null && lastFocalId.current !== currentFocalId) {
      refreshData()
    }
  }, [currentFocalId, refreshData])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    chunks,
    loadingChunks,
    errorChunks,
    loadChunk,
    clearCache,
    refreshData
  }
}