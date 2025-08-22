"use client"

import React, { useCallback } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import type { ImageItem } from "@/components/grid/types/grid"

export default function Home() {
  // Handle artwork click with simple alert
  const handleArtworkClick = useCallback((_image: ImageItem) => {
    alert('Similar artwork exploration coming soon!')
  }, [])

  return (
    <DraggableImageGrid 
      onArtworkClick={handleArtworkClick}
      showPerformanceOverlay={true}
    />
  );
}
