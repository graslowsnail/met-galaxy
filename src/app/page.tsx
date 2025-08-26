"use client"

import React, { useCallback, useState } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import { SimilarityField } from "@/components/similarity-field"
import NavigationOverlay, { type NavigationHistoryItem } from "@/components/similarity-field/NavigationOverlay"
import type { ImageItem } from "@/components/grid-legacy/grid/types/grid"

export default function Home() {
  const [similarityMode, setSimilarityMode] = useState<{
    active: boolean;
    artworkId: number | null;
    artworkData: {
      id: number;
      title: string | null;
      artist: string | null;
      date?: string | null;
      department?: string | null;
      creditLine?: string | null;
      description?: string | null;
      imageUrl: string | null;
      originalImageUrl: string | null;
      objectUrl?: string | null;
    } | null;
  }>({ active: false, artworkId: null, artworkData: null })

  // Navigation history for rabbit hole exploration
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryItem[]>([])

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
      const artworkData = {
        id: image.databaseId,
        title: image.title ?? null,
        artist: image.artist ?? null,
        date: image.date ?? null,
        department: image.department ?? null,
        creditLine: image.creditLine ?? null,
        description: image.description ?? null,
        imageUrl: image.src,
        originalImageUrl: image.src ?? null,
        objectUrl: (image as any).objectUrl ?? null
      }
      
      // Debug logging to check if objectUrl and description are available
      console.log('🎯 Main page: Creating artworkData from image click:', {
        databaseId: image.databaseId,
        title: image.title,
        objectUrl: (image as any).objectUrl,
        hasObjectUrl: !!((image as any).objectUrl),
        description: image.description,
        hasDescription: !!image.description,
        fullArtworkData: artworkData
      })
      
      setSimilarityMode({ 
        active: true, 
        artworkId: image.databaseId,
        artworkData
      })
      
      // Initialize navigation history with main grid + first artwork
      setNavigationHistory([
        {
          id: 'main-grid',
          title: 'Main Grid',
          artist: null,
          thumbnailUrl: null,
          isMainGrid: true
        },
        {
          id: image.databaseId,
          title: image.title ?? null,
          artist: image.artist ?? null,
          thumbnailUrl: image.src
        }
      ])
    } else {
      alert('Similar artwork exploration requires database ID')
    }
  }, [])

  // Handle artwork click from similarity field (for rabbit hole navigation)
  const handleSimilarityArtworkClick = useCallback((artwork: {
    id: number
    title: string | null
    artist: string | null
    imageUrl: string | null
  }) => {
    console.log('Similarity artwork clicked:', {
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      imageUrl: artwork.imageUrl
    })
    
    const artworkData = {
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      imageUrl: artwork.imageUrl,
      originalImageUrl: artwork.imageUrl ?? null,
      objectUrl: (artwork as any).objectUrl ?? null
    }
    
    // Update the focal artwork for rabbit hole navigation
    setSimilarityMode({ 
      active: true, 
      artworkId: artwork.id,
      artworkData
    })
    
    // Add new artwork to navigation history (forward exploration)
    setNavigationHistory(prev => [
      ...prev,
      {
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist,
        thumbnailUrl: artwork.imageUrl
      }
    ])
  }, [])

  // Handle closing similarity mode
  const handleCloseSimilarity = useCallback(() => {
    setSimilarityMode({ active: false, artworkId: null, artworkData: null })
    setNavigationHistory([])
  }, [])
  
  // Handle navigation overlay clicks (smart history truncation)
  const handleNavigateToHistoryItem = useCallback((item: NavigationHistoryItem, index: number) => {
    console.log('Navigate to history item:', { item, index })
    
    if (item.isMainGrid) {
      // Navigate back to main grid
      handleCloseSimilarity()
      return
    }
    
    // Navigate to selected artwork and truncate history at that point
    const artworkData = {
      id: item.id as number,
      title: item.title,
      artist: item.artist,
      imageUrl: item.thumbnailUrl,
      originalImageUrl: item.thumbnailUrl ?? null,
      objectUrl: (item as any).objectUrl ?? null
    }
    
    setSimilarityMode({
      active: true,
      artworkId: item.id as number,
      artworkData
    })
    
    // Truncate history at clicked point (smart backtracking)
    setNavigationHistory(prev => prev.slice(0, index + 1))
  }, [handleCloseSimilarity])

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
      {similarityMode.active && similarityMode.artworkId && similarityMode.artworkData && (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
          <SimilarityField
            key={`similarity-${similarityMode.artworkId}`} // Force remount on focal change
            focalArtworkId={similarityMode.artworkId}
            focalArtwork={similarityMode.artworkData}
            onArtworkClick={handleSimilarityArtworkClick}
          />
          {/* Navigation overlay for rabbit hole exploration */}
          <NavigationOverlay
            navigationHistory={navigationHistory}
            currentFocalId={similarityMode.artworkId ?? 'main-grid'}
            onNavigateToHistoryItem={handleNavigateToHistoryItem}
            isVisible={true}
          />
        </div>
      )}
    </>
  );
}
