"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { SimilarityInfiniteGrid } from "./SimilarityInfiniteGrid"


// Import refactored grid components and hooks  
import { useViewport } from "./grid-legacy/grid/hooks/useViewport"
import ChunkManager from "./grid-legacy/grid/ChunkManager"
import type { ImageItem } from "./grid-legacy/grid/types/grid"
import { GRID_BACKGROUND_COLOR, CLICK_MOVE_THRESHOLD, TRACKPAD_SPEED } from "./grid-legacy/grid/utils/constants"

// Note: Image generation functions now handled by ChunkManager

interface DraggableImageGridProps {
  onArtworkClick?: (image: ImageItem) => void
  showPerformanceOverlay?: boolean
  showLoadingIndicators?: boolean
}

export function DraggableImageGrid({
  onArtworkClick: externalOnArtworkClick,
  showPerformanceOverlay = true,
  showLoadingIndicators = true
}: DraggableImageGridProps = {}) {
  // Use refactored viewport hook
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
  
  // Similarity view state
  const [selectedArtworkId, setSelectedArtworkId] = useState<number | null>(null)
  const [showSimilarity, setShowSimilarity] = useState(false)

  // Connect post-drag events to trigger updates
  useEffect(() => {
    const cleanup = onPostDrag(() => {
      console.log('🔄 Post-drag update triggered')
    })
    return cleanup
  }, [onPostDrag])

  // Handle artwork click for similarity view
  const handleArtworkClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    // Prevent click during dragging OR if mouse moved significantly
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD) {
      console.log('🚫 Click prevented:', { isDragging, dragDistance, threshold: CLICK_MOVE_THRESHOLD })
      return
    }
    
    // Stop event propagation to prevent triggering drag
    event.stopPropagation()
    
    // If external handler provided, use it instead of internal similarity logic
    if (externalOnArtworkClick) {
      externalOnArtworkClick(image)
      return
    }
    
    console.log('Artwork clicked:', {
      imageId: image.id,
      databaseId: image.databaseId,
      objectId: image.objectId,
      title: image.title,
      artist: image.artist,
      src: image.src
    })
    
    // Use the database ID for similarity search (this is what the backend expects)
    const artworkId = image.databaseId
    
    console.log('Using database ID for similarity search:', artworkId)
    
    if (artworkId) {
      setSelectedArtworkId(artworkId)
      setShowSimilarity(true)
    } else {
      console.error('No database ID found for artwork:', image)
      alert('This artwork is not available for similarity search')
    }
  }, [isDragging, dragDistance, externalOnArtworkClick])

  // Close similarity view
  const closeSimilarityView = useCallback(() => {
    setShowSimilarity(false)
    setSelectedArtworkId(null)
  }, [])

  // Use ref to avoid updatePosition in useEffect deps (prevents infinite loop)
  const updatePositionRef = useRef(updatePosition)
  useEffect(() => { 
    updatePositionRef.current = updatePosition 
  }, [updatePosition])

  // Handle trackpad navigation vs blocking mouse wheel
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

  // Show similarity view if selected
  if (showSimilarity && selectedArtworkId) {
    return (
      <SimilarityInfiniteGrid
        artworkId={selectedArtworkId}
        onClose={closeSimilarityView}
      />
    )
  }

  return (
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
        {/* All grid rendering now handled by ChunkManager */}
        <ChunkManager
          viewport={viewport}
          isDragging={isDragging}
          isInitialized={isInitialized}
          onImageClick={handleArtworkClick}
          showPerformanceOverlay={showPerformanceOverlay}
        />
      </div>
    </div>
  )
}
