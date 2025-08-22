"use client"

import React, { useCallback } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import type { ImageItem } from "@/components/grid/types/grid"

export default function Home() {
  // Handle artwork click with simple alert
  const handleArtworkClick = useCallback((image: ImageItem) => {
    console.log('Artwork clicked:', {
      imageId: image.id,
      databaseId: image.databaseId,
      objectId: image.objectId,
      title: image.title,
      artist: image.artist,
      src: image.src
    })
    
    // Show simple "coming soon" alert
    alert('Similar artwork exploration coming soon!')
  }, [])

  return (
    <DraggableImageGrid 
      onArtworkClick={handleArtworkClick}
      showPerformanceOverlay={true}
      showLoadingIndicators={true}
    />
  );
}
