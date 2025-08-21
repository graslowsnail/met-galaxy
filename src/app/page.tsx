"use client"

import React, { useState, useCallback } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import { SimilarityInfiniteGrid } from "@/components/SimilarityInfiniteGrid"
import type { ImageItem } from "@/components/grid-legacy/grid/types/grid"

export default function Home() {
  // Similarity view state
  const [selectedArtworkId, setSelectedArtworkId] = useState<number | null>(null)
  const [showSimilarity, setShowSimilarity] = useState(false)

  // Handle artwork click for similarity view
  const handleArtworkClick = useCallback((image: ImageItem) => {
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
  }, [])

  // Close similarity view
  const closeSimilarityView = useCallback(() => {
    setShowSimilarity(false)
    setSelectedArtworkId(null)
  }, [])

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
    <DraggableImageGrid 
      onArtworkClick={handleArtworkClick}
      showPerformanceOverlay={true}
      showLoadingIndicators={true}
    />
  );
}
