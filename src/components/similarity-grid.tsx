"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useViewport } from "./grid-legacy/grid/hooks/useViewport";
import SimilarityChunkManagerSimple from "./similarity-grid/grid/SimilarityChunkManagerSimple";
import type { 
  SimilarityGridProps,
  SimilarityImageItem
} from "./similarity-grid/grid/types/similarity";
import type { ImageItem } from "./grid-legacy/grid/types/grid";
import { DEBUG_LOGGING } from "./similarity-grid/grid/utils/constants";
import { TRACKPAD_SPEED } from "./grid-legacy/grid/utils/constants";

export type { SimilarityImageItem };

export function SimilarityGrid({ 
  initialArtworkId, 
  focalArtwork,
  onArtworkClick,
  onClose,
  layoutConfig,
  showPerformanceOverlay = false,
  showLoadingIndicators = true
}: SimilarityGridProps & {
  focalArtwork?: {
    id: number
    title: string | null
    artist: string | null
    imageUrl: string | null
    originalImageUrl: string | null
  }
}) {
  
  // ============================================================================
  // SIMPLIFIED STATE MANAGEMENT
  // ============================================================================
  
  const [currentFocalId, setCurrentFocalId] = useState<number>(initialArtworkId);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);

  // ============================================================================
  // NO COMPLEX DATA FETCHING - Just pass props to ChunkManager
  // ============================================================================

  // ============================================================================
  // VIEWPORT MANAGEMENT
  // ============================================================================

  const {
    viewport: viewportState,
    translate,
    isDragging,
    handleMouseDown,
    handleTouchStart,
    containerRef,
    getViewportBounds,
    setViewportPosition,
    updatePosition
  } = useViewport();

  // No complex state construction needed - just pass props to ChunkManager

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Simplified image click handler - let parent handle navigation
  const handleImageClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    if (DEBUG_LOGGING) {
      console.log('🖱️ Similarity image clicked:', {
        id: image.databaseId,
        title: image.title
      });
    }

    // Transform ImageItem to SimilarityImageItem format for parent callback
    const similarityImage: SimilarityImageItem = {
      id: image.id,
      databaseId: image.databaseId ?? image.objectId ?? 0,
      imageUrl: image.src,
      title: image.title || 'Untitled',
      artist: image.artist || 'Unknown',
      width: image.width,
      height: image.height,
      aspectRatio: image.aspectRatio,
      x: 0,
      y: 0,
      similarity: 0,
      isOriginal: false,
      isFocal: false,
      imageType: 'similar',
      gridSize: 'medium'
    };
    
    // Call parent callback - let parent handle navigation if needed
    onArtworkClick?.(similarityImage);
  }, [onArtworkClick]);

  // Simplified back navigation - just update state, no complex positioning
  const handleGoBack = useCallback(() => {
    if (navigationHistory.length === 0) return;
    
    const previousFocalId = navigationHistory[navigationHistory.length - 1];
    if (previousFocalId === undefined) return;
    
    setNavigationHistory(prev => prev.slice(0, -1));
    setCurrentFocalId(previousFocalId);
  }, [navigationHistory]);

  // ============================================================================
  // TRACKPAD/WHEEL SCROLLING SUPPORT
  // ============================================================================

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
  }, [containerRef]);

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-[#EDE9E5] overflow-hidden">
      {/* Header with navigation */}
      <div className="absolute top-4 left-4 z-50 flex items-center space-x-3">
        <button
          onClick={onClose}
          className="bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-lg shadow-md transition-colors flex items-center space-x-2"
        >
          <span>←</span>
          <span>Back to Grid</span>
        </button>
        
        {navigationHistory.length > 0 && (
          <button
            onClick={handleGoBack}
            className="bg-blue-500/90 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md transition-colors flex items-center space-x-2"
            title={`Go back to previous artwork (${navigationHistory.length} steps)`}
          >
            <span>↶</span>
            <span>Back ({navigationHistory.length})</span>
          </button>
        )}
      </div>

      {/* Main grid container with viewport management */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing hide-scrollbars"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          backgroundColor: '#EDE9E5',
          overscrollBehavior: 'none', // Prevent overscroll
          touchAction: 'none', // Prevent touch scrolling
          msOverflowStyle: 'none', // IE and Edge
          scrollbarWidth: 'none' // Firefox
        }}
      >
        <div
          className={`relative w-full h-full ${
            isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
          }`}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px)`,
            willChange: isDragging ? 'transform' : 'auto', // Optimize for smooth dragging
          }}
        >
          {/* Simplified similarity chunk manager */}
          <SimilarityChunkManagerSimple
            viewport={viewportState}
            isDragging={isDragging}
            isInitialized={viewportState.width > 0 && viewportState.height > 0}
            focalArtworkId={currentFocalId}
            focalArtwork={focalArtwork}
            onImageClick={handleImageClick}
            showPerformanceOverlay={showPerformanceOverlay}
          />
        </div>
      </div>
    </div>
  );
}