"use client"

import type React from "react"

import { useEffect, useCallback } from "react"

// Import grid components and hooks  
import { useViewport } from "./grid/hooks/useViewport"
import ChunkManager from "./grid/ChunkManager"
import type { ImageItem } from "./grid/types/grid"
import { GRID_BACKGROUND_COLOR, CLICK_MOVE_THRESHOLD, TRACKPAD_SPEED } from "./grid/utils/constants"

// Note: Image generation functions now handled by ChunkManager

interface DraggableImageGridProps {
  onArtworkClick?: (image: ImageItem) => void
  showPerformanceOverlay?: boolean
}

export function DraggableImageGrid({
  onArtworkClick,
  showPerformanceOverlay = true
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

  // Connect post-drag events to trigger updates
  useEffect(() => {
    const cleanup = onPostDrag(() => {
      // Trigger virtualization updates after drag
    })
    return cleanup
  }, [onPostDrag])

  // Handle artwork click
  const handleArtworkClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    // Prevent click during dragging
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD) {
      return
    }
    
    event.stopPropagation()
    
    // Use external handler if provided, otherwise show default alert
    if (onArtworkClick) {
      onArtworkClick(image)
    } else {
      alert('Similar artwork exploration coming soon!')
    }
  }, [isDragging, dragDistance, onArtworkClick])


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
          if (deltaX !== 0 || deltaY !== 0) {
            updatePosition(deltaX, deltaY)
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
  }, [containerRef, updatePosition])


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
