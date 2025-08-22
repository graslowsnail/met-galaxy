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
    
    console.log(`📋 Assigned similar artworks to ${assignments.size} chunks`)
    
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
        // Get chunk assignments for predefined rings (calculate if needed)
        let assignments = chunkAssignmentsCache.current
        if (assignments.size === 0 || lastFocalId.current !== currentFocalId) {
          assignments = calculateChunkAssignments()
          chunkAssignmentsCache.current = assignments
          lastFocalId.current = currentFocalId
        }
        
        // For chunks outside the predefined rings, use empty similarity array (pure random)
        const chunkArtworks = assignments.get(chunkId) || []
        
        console.log(`🔧 Creating chunk ${chunkId}: ${chunkArtworks.length} similar artworks assigned`)
        
        // Fetch unique random artworks for this specific chunk
        let chunkRandomArtworks: any[] = []
        try {
          if (DEBUG_LOGGING) {
            console.log(`🎲 Fetching random artworks for chunk ${chunkId} (${chunkX}, ${chunkY})...`)
          }
          
          const randomResponse = await apiClient.getChunkArtworks({
            chunkX,
            chunkY,
            count: 20 // Get enough random images to fill the chunk
          })
          
          if (DEBUG_LOGGING) {
            console.log(`🔍 API Response for chunk ${chunkId}:`, randomResponse)
          }
          
          chunkRandomArtworks = randomResponse.artworks || []
          
          if (DEBUG_LOGGING) {
            console.log(`🎲 Fetched ${chunkRandomArtworks.length} random artworks for chunk ${chunkId}`, chunkRandomArtworks)
          }
        } catch (error) {
          console.error(`❌ Failed to fetch random artworks for chunk ${chunkId}:`, error)
          chunkRandomArtworks = []
        }
        
        chunk = createSimilarityChunk(
          chunkX, 
          chunkY, 
          chunkArtworks,
          chunkRandomArtworks
        )
        
        if (DEBUG_LOGGING) {
          console.log(`📦 Created similarity chunk ${chunk.id}: ${chunk.images.length} images (${chunkArtworks.length} similar, ${chunkRandomArtworks.length} random)`)
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
  }, [chunks, loadingChunks, errorChunks, similarityData, currentFocalId, calculateChunkAssignments])
  
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
        await loadChunk('0,0')
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
        const chunkId = `${pos.x},${pos.y}`
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