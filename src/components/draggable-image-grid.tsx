"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { SimilarityGridPage } from "./similarity-grid-page"


// Import refactored grid components and hooks
import { useViewport } from "./grid/hooks/useViewport"
import ChunkManager from "./grid/ChunkManager"
import type { ImageItem } from "./grid/types/grid"
import { GRID_BACKGROUND_COLOR } from "./grid/utils/constants"

// Note: Image generation functions now handled by ChunkManager

export function DraggableImageGrid() {
  // Use refactored viewport hook
  const { 
    translate, 
    isInitialized, 
    isDragging, 
    handleMouseDown, 
    handleTouchStart,
    containerRef,
    viewport,
    onPostDrag
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
    // Prevent click during dragging
    if (isDragging) return
    
    // Stop event propagation to prevent triggering drag
    event.stopPropagation()
    
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
  }, [isDragging])

  // Close similarity view
  const closeSimilarityView = useCallback(() => {
    setShowSimilarity(false)
    setSelectedArtworkId(null)
  }, [])

  // Show similarity view if selected
  if (showSimilarity && selectedArtworkId) {
    return (
      <SimilarityGridPage
        artworkId={selectedArtworkId}
        onClose={closeSimilarityView}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ backgroundColor: GRID_BACKGROUND_COLOR }}
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
          showPerformanceOverlay={true}
        />
      </div>
    </div>
  )
}
