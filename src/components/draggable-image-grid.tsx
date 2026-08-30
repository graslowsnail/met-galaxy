"use client"


import { useEffect, useCallback, useRef } from "react"

// Import refactored grid components and hooks  
import { useViewport } from "./grid-legacy/grid/hooks/useViewport"
import ChunkManager from "./grid-legacy/grid/ChunkManager"
import type { ImageItem } from "./grid-legacy/grid/types/grid"
import { GRID_BACKGROUND_COLOR, CLICK_MOVE_THRESHOLD, TRACKPAD_SPEED } from "./grid-legacy/grid/utils/constants"
import type { Artwork } from "@/types/api"

// Note: Image generation functions now handled by ChunkManager

interface DraggableImageGridProps {
  onArtworkClick?: (image: ImageItem) => void
  artworks?: Artwork[]
  hasMoreArtworks?: boolean
  isLoadingMoreArtworks?: boolean
  onLoadMoreArtworks?: () => Promise<void>
  showPerformanceOverlay?: boolean
  showLoadingIndicators?: boolean
}

export function DraggableImageGrid({
  onArtworkClick: externalOnArtworkClick,
  artworks,
  hasMoreArtworks = false,
  isLoadingMoreArtworks = false,
  onLoadMoreArtworks,
  showPerformanceOverlay = true,
  showLoadingIndicators: _showLoadingIndicators = true
}: DraggableImageGridProps = {}) {
  // Use refactored viewport hook
  const { 
    translate, 
    isInitialized, 
    isDragging, 
    dragDistance,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    containerRef,
    viewport,
    onPostDrag,
    updatePosition,
  } = useViewport()

  // Connect post-drag events to trigger updates
  useEffect(() => {
    const cleanup = onPostDrag(() => {
      // Post-drag update triggered
    })
    return cleanup
  }, [onPostDrag])

  // Handle artwork click
  const handleArtworkClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    // Prevent click during dragging OR if mouse moved significantly
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD) {
      return
    }
    
    // Stop event propagation to prevent triggering drag
    event.stopPropagation()
    
    // If external handler provided, use it
    if (externalOnArtworkClick) {
      externalOnArtworkClick(image)
      return
    }
    
    // Artwork clicked - no external handler provided
    
    // Show simple "coming soon" alert
    alert('Similar artwork exploration coming soon!')
  }, [isDragging, dragDistance, externalOnArtworkClick])

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
    let pendingDeltaX = 0
    let pendingDeltaY = 0
    
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
        pendingDeltaX += -e.deltaX * speed
        pendingDeltaY += -e.deltaY * speed

        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            updatePositionRef.current(pendingDeltaX, pendingDeltaY)
            pendingDeltaX = 0
            pendingDeltaY = 0
            rafId = 0
          })
        }
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


  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing hide-scrollbars"
      style={{ 
        backgroundColor: GRID_BACKGROUND_COLOR,
        overscrollBehavior: 'none', // Prevent overscroll
        touchAction: 'none', // Prevent touch scrolling
        userSelect: 'none',
        msOverflowStyle: 'none', // IE and Edge
        scrollbarWidth: 'none' // Firefox
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className="relative"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px)`,
          willChange: 'transform',
        }}
      >
        {/* All grid rendering now handled by ChunkManager */}
        <ChunkManager
          viewport={viewport}
          isDragging={isDragging}
          isInitialized={isInitialized}
          onImageClick={handleArtworkClick}
          artworks={artworks}
          hasMoreArtworks={hasMoreArtworks}
          isLoadingMoreArtworks={isLoadingMoreArtworks}
          onLoadMoreArtworks={onLoadMoreArtworks}
          showPerformanceOverlay={showPerformanceOverlay}
        />
      </div>
    </div>
  )
}
