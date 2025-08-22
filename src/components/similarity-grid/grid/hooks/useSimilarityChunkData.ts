/**
 * Hook for managing similarity chunk data
 * 
 * Handles the loading, caching, and management of chunks specifically
 * for the similarity grid system. Creates chunks with focal images,
 * similar images, and random filler images.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { 
  SimilarityChunk, 
  SimilarityChunkData,
  SimilarityData
} from '../types/similarity'
import type { SimilarArtwork } from '@/types/api'
import { 
  createFocalChunk, 
  createSimilarityChunk,
  assignSimilarArtworksToChunks,
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
  randomArtworks: any[] | null
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
  similarityData,
  randomArtworks
}: UseSimilarityChunkDataProps): UseSimilarityChunkDataReturn {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [chunks] = useState<Map<string, SimilarityChunk>>(new Map())
  const [loadingChunks] = useState<Set<string>>(new Set())
  const [errorChunks] = useState<Map<string, Error>>(new Map())
  
  // Cache for chunk assignments to avoid recalculation
  const chunkAssignmentsCache = useRef<Map<string, SimilarArtwork[]>>(new Map())
  const lastFocalId = useRef<number | null>(null)
  
  // ============================================================================
  // CHUNK ASSIGNMENT LOGIC
  // ============================================================================
  
  /**
   * Calculate which similar artworks belong to which chunks
   */
  const calculateChunkAssignments = useCallback(() => {
    if (!similarityData?.similarArtworks) {
      return new Map<string, SimilarArtwork[]>()
    }
    
    const focalArtwork = similarityData.similarArtworks.find(artwork => artwork.original)
    if (!focalArtwork) {
      console.warn('No focal artwork found in similarity data')
      return new Map<string, SimilarArtwork[]>()
    }
    
    const assignments = assignSimilarArtworksToChunks(
      similarityData.similarArtworks,
      focalArtwork
    )
    
    if (DEBUG_LOGGING) {
      console.log(`📋 Calculated chunk assignments for ${assignments.size} chunks`)
      assignments.forEach((artworks, chunkKey) => {
        console.log(`  Chunk ${chunkKey}: ${artworks.length} artworks`)
      })
    }
    
    return assignments
  }, [similarityData])
  
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
      const [chunkX, chunkY] = chunkId.split(',').map(Number)
      let chunk: SimilarityChunk
      
      // Create focal chunk (0,0)
      if (chunkX === 0 && chunkY === 0) {
        if (!similarityData?.similarArtworks) {
          throw new Error('No similarity data available for focal chunk')
        }
        
        const focalArtwork = similarityData.similarArtworks.find(artwork => artwork.original)
        if (!focalArtwork) {
          throw new Error('No focal artwork found in similarity data')
        }
        
        chunk = createFocalChunk(focalArtwork)
        
        if (DEBUG_LOGGING) {
          console.log(`🎯 Created focal chunk: ${chunk.id}`)
        }
      }
      // Create similarity chunks
      else {
        // Get chunk assignments (calculate if needed)
        let assignments = chunkAssignmentsCache.current
        if (assignments.size === 0 || lastFocalId.current !== currentFocalId) {
          assignments = calculateChunkAssignments()
          chunkAssignmentsCache.current = assignments
          lastFocalId.current = currentFocalId
        }
        
        const chunkArtworks = assignments.get(chunkId) || []
        const chunkRandomArtworks = randomArtworks || []
        
        chunk = createSimilarityChunk(
          chunkX, 
          chunkY, 
          chunkArtworks,
          chunkRandomArtworks
        )
        
        if (DEBUG_LOGGING) {
          console.log(`📦 Created similarity chunk ${chunk.id}: ${chunk.images.length} images (${chunkArtworks.length} similar, ${chunk.images.length - chunkArtworks.length} random)`)
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
  }, [chunks, loadingChunks, errorChunks, similarityData, randomArtworks, currentFocalId, calculateChunkAssignments])
  
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
    chunkAssignmentsCache.current.clear()
    lastFocalId.current = null
    
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
  // AUTOMATIC CHUNK PRELOADING
  // ============================================================================
  
  /**
   * Preload chunks around the focal chunk
   */
  useEffect(() => {
    if (!similarityData) return
    
    const preloadChunks = async () => {
      // Always load focal chunk first
      try {
        await loadChunk('0,0')
      } catch (error) {
        console.error('Failed to load focal chunk:', error)
        return
      }
      
      // Preload ring 1 chunks (immediately around focal with similarity)
      const ring1Positions = CHUNK_POSITIONS.RING_1
      for (const pos of ring1Positions) {
        const chunkId = `${pos.x},${pos.y}`
        try {
          loadChunk(chunkId) // Don't await - load in parallel
        } catch (error) {
          console.warn(`Failed to preload chunk ${chunkId}:`, error)
        }
      }
      
      // Preload ring 2 chunks (random images with some low similarity)
      const ring2Positions = CHUNK_POSITIONS.RING_2
      for (const pos of ring2Positions) {
        const chunkId = `${pos.x},${pos.y}`
        try {
          loadChunk(chunkId) // Don't await - load in parallel
        } catch (error) {
          console.warn(`Failed to preload chunk ${chunkId}:`, error)
        }
      }
      
      // Preload ring 3 chunks (mostly random images for exploration)
      const ring3Positions = CHUNK_POSITIONS.RING_3
      for (const pos of ring3Positions) {
        const chunkId = `${pos.x},${pos.y}`
        try {
          loadChunk(chunkId) // Don't await - load in parallel
        } catch (error) {
          console.warn(`Failed to preload chunk ${chunkId}:`, error)
        }
      }
      
      if (DEBUG_LOGGING) {
        console.log(`🚀 Preloading ${ring1Positions.length + ring2Positions.length + ring3Positions.length + 1} chunks around focal image`)
        console.log(`   Ring 1: ${ring1Positions.length} chunks (similarity)`)
        console.log(`   Ring 2: ${ring2Positions.length} chunks (mixed)`)
        console.log(`   Ring 3: ${ring3Positions.length} chunks (random)`)
      }
    }
    
    preloadChunks()
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