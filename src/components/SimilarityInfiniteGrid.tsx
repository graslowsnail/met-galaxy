/**
 * SimilarityInfiniteGrid - Chunk-based infinite scroll grid for similar images
 * 
 * Uses the same chunk-based infinite scroll system as the main grid,
 * but populated with similar images instead of random artworks.
 */

"use client"

import type React from "react"

import { useEffect, useCallback, useRef } from "react"
import { useSimilarArtworks } from '@/hooks/use-similar-artworks'

// Import the same grid system components
import { useViewport } from "./grid-legacy/grid/hooks/useViewport"
import SimilarityChunkManager from "./similarity-grid/SimilarityChunkManager"
import type { ImageItem } from "./grid-legacy/grid/types/grid"
import { GRID_BACKGROUND_COLOR, CLICK_MOVE_THRESHOLD, TRACKPAD_SPEED } from "./grid-legacy/grid/utils/constants"

interface SimilarityInfiniteGridProps {
  artworkId: number
  onClose: () => void
}

export function SimilarityInfiniteGrid({ 
  artworkId,
  onClose 
}: SimilarityInfiniteGridProps) {
  // Fetch similarity data
  const { data, isLoading, error } = useSimilarArtworks({ artworkId })
  
  // Use the same viewport hook as main grid
  const { 
    translate, 
    isInitialized, 
    isDragging, 
    dragDistance,
    handleMouseDown, 
    handleTouchStart,
    containerRef,
    viewport,
    onPostDrag,
    updatePosition
  } = useViewport()

  // Connect post-drag events to trigger updates
  useEffect(() => {
    const cleanup = onPostDrag(() => {
      console.log('🔄 Similarity grid post-drag update triggered')
    })
    return cleanup
  }, [onPostDrag])

  // Handle artwork click 
  const handleArtworkClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    // Prevent click during dragging
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD) {
      console.log('🚫 Click prevented:', { isDragging, dragDistance, threshold: CLICK_MOVE_THRESHOLD })
      return
    }
    
    event.stopPropagation()
    
    console.log('Similar artwork clicked:', {
      imageId: image.id,
      databaseId: image.databaseId,
      title: image.title,
      artist: image.artist,
      src: image.src
    })
    
    // Could navigate to this artwork's similarity view
  }, [isDragging, dragDistance])

  // Use ref to avoid updatePosition in useEffect deps (prevents infinite loop)
  const updatePositionRef = useRef(updatePosition)
  useEffect(() => { 
    updatePositionRef.current = updatePosition 
  }, [updatePosition])

  // Handle trackpad navigation vs blocking mouse wheel (same as main grid)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    let rafId = 0
    
    const handleWheelEvent = (e: WheelEvent) => {
      // Ignore browser pinch-zoom
      if (e.ctrlKey) return
      
      e.preventDefault()
      e.stopPropagation()
      
      // Detect trackpad vs mouse wheel
      const isTrackpadGesture = (
        // Trackpad usually has both X and Y movement
        Math.abs(e.deltaX) > 0 ||
        // Trackpad has smaller, smoother deltas
        (Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50)
      )
      
      if (isTrackpadGesture) {
        // Enable trackpad navigation with natural direction
        const speed = TRACKPAD_SPEED
        const deltaX = -e.deltaX * speed  // Invert X for natural movement
        const deltaY = -e.deltaY * speed  // Invert Y for natural movement
        
        // Cancel previous RAF to prevent stacking
        if (rafId) cancelAnimationFrame(rafId)
        
        // Update translate position with RAF throttling
        rafId = requestAnimationFrame(() => {
          // Guard against tiny/noop deltas to avoid extra renders
          if (deltaX !== 0 || deltaY !== 0) {
            updatePositionRef.current(deltaX, deltaY)
          }
        })
      }
      // Mouse wheel events are blocked (no movement)
    }
    
    // Only add listener to container, not document (prevent duplicate handlers)
    container.addEventListener('wheel', handleWheelEvent, { passive: false })
    
    // Prevent body scrolling and hide scrollbars completely
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    // Apply CSS classes to hide scrollbars
    document.documentElement.classList.add('no-scroll')
    document.body.classList.add('no-scroll')
    
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      container.removeEventListener('wheel', handleWheelEvent)
      
      // Cancel any pending RAF
      if (rafId) cancelAnimationFrame(rafId)
      
      // Remove CSS classes
      document.documentElement.classList.remove('no-scroll')
      document.body.classList.remove('no-scroll')
      
      // Restore original overflow styles
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [containerRef])

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white/10 rounded-lg p-8 text-white">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-lg">Finding similar artworks...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data?.success || !data.data.length) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Error</div>
            <div className="text-neutral-600 mb-4">
              {error?.message || 'Failed to load similar artworks'}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-colors"
        aria-label="Close similarity view"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Info overlay */}
      <div className="fixed top-4 left-4 z-10 bg-white/90 rounded-lg p-4 shadow-lg max-w-sm">
        <h2 className="font-semibold text-lg mb-2">Similarity Explorer</h2>
        <p className="text-sm text-neutral-600 mb-3">
          Exploring artworks similar to &ldquo;{data.meta?.targetTitle}&rdquo; by {data.meta?.targetArtist}
        </p>
        <div className="text-xs text-neutral-500">
          <div>• Center: Original artwork (large)</div>
          <div>• Grid: Similar artworks by similarity</div>
          <div>• Drag and scroll to explore</div>
          <div>• Found {data.data.length - 1} similar artworks</div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing hide-scrollbars"
        style={{ 
          backgroundColor: GRID_BACKGROUND_COLOR,
          overscrollBehavior: 'none', // Prevent overscroll
          touchAction: 'none', // Prevent touch scrolling
          msOverflowStyle: 'none', // IE and Edge
          scrollbarWidth: 'none' // Firefox
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className={`relative ${
            isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
          }`}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px)`,
            willChange: isDragging ? 'transform' : 'auto', // Optimize for smooth dragging
          }}
        >
          {/* Similarity chunk manager - handles the grid rendering with similar images */}
          <SimilarityChunkManager
            viewport={viewport}
            isDragging={isDragging}
            isInitialized={isInitialized}
            onImageClick={handleArtworkClick}
            showPerformanceOverlay={true}
            similarityData={data}
          />
        </div>
      </div>
    </div>
  )
}