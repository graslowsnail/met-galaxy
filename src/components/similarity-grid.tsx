"use client";

import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { useSimilarArtworks } from "@/hooks/use-similar-artworks";
import { useViewport } from "./grid-legacy/grid/hooks/useViewport";
import { SimilarityGridRenderer } from "./similarity-grid/grid/SimilarityGridRenderer";
import type { 
  SimilarityGridProps,
  SimilarityImageItem, 
  SimilarityGridState,
  SimilarityData
} from "./similarity-grid/grid/types/similarity";
import type { SimilarArtwork } from "@/types/api";
import { 
  DEBUG_LOGGING,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  FOCAL_IMAGE_SIZE,
  FOCAL_IMAGE_OFFSET_X,
  FOCAL_IMAGE_OFFSET_Y
} from "./similarity-grid/grid/utils/constants";
import { TRACKPAD_SPEED } from "./grid-legacy/grid/utils/constants";

export type { SimilarityImageItem };

export function SimilarityGrid({ 
  initialArtworkId, 
  onArtworkClick,
  onClose,
  layoutConfig,
  showPerformanceOverlay = false,
  showLoadingIndicators = true
}: SimilarityGridProps) {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [currentFocalId, setCurrentFocalId] = useState<number>(initialArtworkId);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch similar artworks for current focal image
  const { 
    data: similarData, 
    isLoading: isLoadingSimilarity, 
    error: similarError 
  } = useSimilarArtworks({ 
    artworkId: currentFocalId 
  });

  // Random artworks are now fetched per-chunk, similar to main grid

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

  // Calculate viewport bounds for chunk management
  const viewportBounds = useMemo(() => {
    return getViewportBounds()
  }, [getViewportBounds]);

  // ============================================================================
  // GRID STATE CONSTRUCTION
  // ============================================================================

  const gridState: SimilarityGridState = useMemo(() => {
    // Transform similarity API response to internal format
    let transformedSimilarityData: SimilarityData | null = null;
    
    // Only use similarity data if it matches the current focal ID
    // This prevents showing old similarity data when focal image changes
    if (similarData?.data && similarData?.meta && 
        similarData.meta.targetId === currentFocalId) {
      transformedSimilarityData = {
        targetArtwork: {
          id: similarData.meta.targetId,
          title: similarData.meta.targetTitle,
          artist: similarData.meta.targetArtist,
          imageUrl: similarData.data.find(a => a.original)?.imageUrl || ''
        },
        similarArtworks: similarData.data,
        meta: similarData.meta
      };
    }

    return {
      currentFocalId,
      focalImagePosition: { x: 0, y: 0 },
      loadedChunks: new Map(), // Will be managed by chunk system
      visibleChunks: [],
      navigationHistory,
      isTransitioning,
      similarityData: transformedSimilarityData,
      randomArtworks: null, // No longer using global random artworks
      isLoadingSimilarity,
      isLoadingRandom: false // No global random loading
    };
  }, [
    currentFocalId,
    navigationHistory,
    isTransitioning,
    similarData,
    isLoadingSimilarity
  ]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Handle image clicks for navigation
  const handleImageClick = useCallback((image: SimilarityImageItem) => {
    if (DEBUG_LOGGING) {
      console.log('🖱️ Similarity image clicked:', {
        id: image.databaseId,
        title: image.title,
        similarity: image.similarity,
        imageType: image.imageType
      });
    }

    // Don't re-focus on the same image
    if (image.isFocal) return;
    
    // Add current focal to history before changing
    setNavigationHistory(prev => [...prev, currentFocalId]);
    
    // Start transition
    setIsTransitioning(true);
    
    // Update focal image
    setCurrentFocalId(image.databaseId);
    
    // Center viewport on the new focal image
    // The focal image is positioned at chunk (0,0) + focal image offsets
    // Calculate the center position of the focal image in world coordinates
    const focalImageCenterX = 0 + FOCAL_IMAGE_OFFSET_X + (FOCAL_IMAGE_SIZE / 2);
    const focalImageCenterY = 0 + FOCAL_IMAGE_OFFSET_Y + (FOCAL_IMAGE_SIZE / 2);
    
    // To center this position on screen, translate viewport so focal image appears in center
    const centerX = (viewportState.width / 2) - focalImageCenterX;
    const centerY = (viewportState.height / 2) - focalImageCenterY;
    
    // Smoothly animate to center on new focal image
    setViewportPosition({ x: centerX, y: centerY });
    
    // Transition will be cleared when new data loads (see useEffect below)
    
    // Call parent callback
    onArtworkClick?.(image);
  }, [currentFocalId, onArtworkClick, viewportState.width, viewportState.height, setViewportPosition]);

  // Handle back navigation
  const handleGoBack = useCallback(() => {
    if (navigationHistory.length === 0) return;
    
    const previousFocalId = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory(prev => prev.slice(0, -1));
    setCurrentFocalId(previousFocalId);
    
    // Center viewport on the focal image when going back
    const focalImageCenterX = 0 + FOCAL_IMAGE_OFFSET_X + (FOCAL_IMAGE_SIZE / 2);
    const focalImageCenterY = 0 + FOCAL_IMAGE_OFFSET_Y + (FOCAL_IMAGE_SIZE / 2);
    
    // To center this position on screen, translate viewport so focal image appears in center
    const centerX = (viewportState.width / 2) - focalImageCenterX;
    const centerY = (viewportState.height / 2) - focalImageCenterY;
    setViewportPosition({ x: centerX, y: centerY });
  }, [navigationHistory, viewportState.width, viewportState.height, setViewportPosition]);

  // ============================================================================
  // TRANSITION MANAGEMENT
  // ============================================================================

  // Clear transition state when new similarity data loads for current focal ID
  useEffect(() => {
    if (similarData?.meta?.targetId === currentFocalId && !isLoadingSimilarity) {
      setIsTransitioning(false);
    }
  }, [similarData, currentFocalId, isLoadingSimilarity]);

  // Center viewport on focal image when viewport is ready (initial centering)
  useEffect(() => {
    if (viewportState.width > 0 && viewportState.height > 0) {
      // Calculate the center position of the focal image in world coordinates
      const focalImageCenterX = 0 + FOCAL_IMAGE_OFFSET_X + (FOCAL_IMAGE_SIZE / 2);
      const focalImageCenterY = 0 + FOCAL_IMAGE_OFFSET_Y + (FOCAL_IMAGE_SIZE / 2);
      
      // To center this position on screen, translate viewport so focal image appears in center
      const centerX = (viewportState.width / 2) - focalImageCenterX;
      const centerY = (viewportState.height / 2) - focalImageCenterY;
      
      // Center on focal image immediately when viewport is ready
      setViewportPosition({ x: centerX, y: centerY });
    }
  }, [viewportState.width, viewportState.height, setViewportPosition]);

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
  // ERROR HANDLING
  // ============================================================================

  if (similarError) {
    return (
      <div className="fixed inset-0 bg-[#EDE9E5] flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <p className="text-red-600 mb-4 font-medium">Error loading similar artworks</p>
            <p className="text-gray-600 text-sm mb-4">{similarError.message}</p>
            <div className="space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm"
              >
                Back to Grid
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {/* Main similarity grid renderer */}
          <SimilarityGridRenderer
            gridState={gridState}
            viewportBounds={viewportBounds}
            onImageClick={handleImageClick}
            showPerformanceOverlay={showPerformanceOverlay}
            showLoadingIndicators={showLoadingIndicators}
          />
        </div>
      </div>
    </div>
  );
}