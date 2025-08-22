"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useSimilarArtworks } from "@/hooks/use-similar-artworks";
import { useRandomArtworks } from "@/hooks/use-artworks";
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

  // Fetch random artworks for filling in gaps (start immediately)
  const { 
    data: randomArtworks, 
    isLoading: isLoadingRandom 
  } = useRandomArtworks({ 
    count: 100,
    enabled: true // Always enabled to load random images immediately
  });

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
      randomArtworks,
      isLoadingSimilarity,
      isLoadingRandom
    };
  }, [
    currentFocalId,
    navigationHistory,
    isTransitioning,
    similarData,
    randomArtworks,
    isLoadingSimilarity,
    isLoadingRandom
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
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px)`,
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