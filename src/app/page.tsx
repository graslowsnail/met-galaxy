"use client"

import React, { useCallback, useState } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import { SimilarityField } from "@/components/similarity-field"
import type { ImageItem } from "@/components/grid-legacy/grid/types/grid"

export default function Home() {
  const [similarityMode, setSimilarityMode] = useState<{
    active: boolean;
    artworkId: number | null;
    artworkData: {
      id: number;
      title: string | null;
      artist: string | null;
      imageUrl: string | null;
      originalImageUrl: string | null;
    } | null;
  }>({ active: false, artworkId: null, artworkData: null })

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
        artworkId: image.databaseId,
        artworkData: {
          id: image.databaseId,
          title: image.title ?? null,
          artist: image.artist ?? null,
          imageUrl: image.src,
          originalImageUrl: image.src ?? null
        }
      })
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
    // Update the focal artwork for rabbit hole navigation
    setSimilarityMode({ 
      active: true, 
      artworkId: artwork.id,
      artworkData: {
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist,
        imageUrl: artwork.imageUrl,
        originalImageUrl: artwork.imageUrl ?? null
      }
    })
  }, [])

  // Handle closing similarity mode
  const handleCloseSimilarity = useCallback(() => {
    setSimilarityMode({ active: false, artworkId: null, artworkData: null })
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
      {similarityMode.active && similarityMode.artworkId && similarityMode.artworkData && (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
          <SimilarityField
            key={`similarity-${similarityMode.artworkId}`} // Force remount on focal change
            focalArtworkId={similarityMode.artworkId}
            focalArtwork={similarityMode.artworkData}
            onArtworkClick={handleSimilarityArtworkClick}
          />
          {/* Control panel */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Close button */}
            <button
              onClick={handleCloseSimilarity}
              style={{
                padding: '10px 15px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ← Back to Grid
            </button>
          </div>
        </div>
      )}
    </>
  );
}
