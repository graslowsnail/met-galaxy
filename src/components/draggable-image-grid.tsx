"use client"

import type React from "react"
import { useEffect, useCallback } from "react"
import { useViewport } from "./grid/hooks/useViewport"
import ChunkManager from "./grid/ChunkManager"
import type { ImageItem } from "./grid/types/grid"
import { GRID_BACKGROUND_COLOR, CLICK_MOVE_THRESHOLD, TRACKPAD_SPEED } from "./grid/utils/constants"

interface DraggableImageGridProps {
  onArtworkClick?: (image: ImageItem) => void
  showPerformanceOverlay?: boolean
}

export function DraggableImageGrid({
  onArtworkClick,
  showPerformanceOverlay = true
}: DraggableImageGridProps) {
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

  useEffect(() => onPostDrag(() => { /* Post-drag cleanup */ }), [onPostDrag])

  const handleArtworkClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD) return
    
    event.stopPropagation()
    
    if (onArtworkClick) {
      onArtworkClick(image)
    } else {
      alert('Similar artwork exploration coming soon!')
    }
  }, [isDragging, dragDistance, onArtworkClick])

  // Handle trackpad scrolling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    let rafId = 0
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // Allow pinch-zoom
      
      e.preventDefault()
      e.stopPropagation()
      
      // Only respond to trackpad gestures (smooth, multi-axis movement)
      const isTrackpad = Math.abs(e.deltaX) > 0 || (Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50)
      
      if (isTrackpad) {
        const deltaX = -e.deltaX * TRACKPAD_SPEED
        const deltaY = -e.deltaY * TRACKPAD_SPEED
        
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          if (deltaX !== 0 || deltaY !== 0) updatePosition(deltaX, deltaY)
        })
      }
    }
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    
    // Prevent body scrolling
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    document.documentElement.classList.add('no-scroll')
    document.body.classList.add('no-scroll')
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
      if (rafId) cancelAnimationFrame(rafId)
      
      document.documentElement.classList.remove('no-scroll')
      document.body.classList.remove('no-scroll')
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
        overscrollBehavior: 'none',
        touchAction: 'none',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={`relative ${isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'}`}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px)`,
          willChange: isDragging ? 'transform' : 'auto'
        }}
      >
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
