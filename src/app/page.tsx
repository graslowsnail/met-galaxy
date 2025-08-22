"use client"

import React, { useCallback, useState } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import { SimilarityGrid } from "@/components/similarity-grid"
import type { ImageItem } from "@/components/grid-legacy/grid/types/grid"
import type { SimilarityImageItem } from "@/components/similarity-grid"

export default function Home() {
  const [similarityMode, setSimilarityMode] = useState<{
    active: boolean;
    artworkId: number | null;
  }>({ active: false, artworkId: null })

  // Handle artwork click from main grid
  const handleArtworkClick = useCallback((image: ImageItem) => {
    console.log('Artwork clicked:', {
      imageId: image.id,
      databaseId: image.databaseId,
      objectId: image.objectId,
      title: image.title,
      artist: image.artist,
      src: image.src
    })
    
    // Check if we have a database ID for similarity search
    if (image.databaseId) {
      setSimilarityMode({ 
        active: true, 
        artworkId: image.databaseId 
      })
    } else {
      alert('Similar artwork exploration requires database ID')
    }
  }, [])

  // Handle artwork click from similarity grid (for rabbit hole navigation)
  const handleSimilarityArtworkClick = useCallback((image: SimilarityImageItem) => {
    console.log('Similarity artwork clicked:', {
      imageId: image.id,
      databaseId: image.databaseId,
      title: image.title,
      artist: image.artist,
      similarity: image.similarity
    })
    // The SimilarityGrid component will handle the re-focusing internally
  }, [])

  // Handle closing similarity mode
  const handleCloseSimilarity = useCallback(() => {
    setSimilarityMode({ active: false, artworkId: null })
  }, [])

  return (
    <>
      {/* Main infinite grid */}
      {!similarityMode.active && (
        <DraggableImageGrid 
          onArtworkClick={handleArtworkClick}
          showPerformanceOverlay={false}
          showLoadingIndicators={true}
        />
      )}

      {/* Similarity exploration mode */}
      {similarityMode.active && similarityMode.artworkId && (
        <SimilarityGrid
          initialArtworkId={similarityMode.artworkId}
          onArtworkClick={handleSimilarityArtworkClick}
          onClose={handleCloseSimilarity}
        />
      )}
    </>
  );
}
