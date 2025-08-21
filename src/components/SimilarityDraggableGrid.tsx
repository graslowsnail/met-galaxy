/**
 * SimilarityDraggableGrid - Grid-based similarity view similar to main grid
 * 
 * Displays the clicked image large in the center, with similar images
 * arranged in a draggable grid around it, just like the main interface.
 */

"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSimilarArtworks } from '@/hooks/use-similar-artworks'
import { useViewport } from './grid-legacy/grid/hooks/useViewport'
import type { SimilarArtwork } from '@/types/api'
import { 
  GRID_BACKGROUND_COLOR, 
  COLUMN_WIDTH, 
  GAP,
  CLICK_MOVE_THRESHOLD,
  TRACKPAD_SPEED 
} from './grid-legacy/grid/utils/constants'

interface SimilarityDraggableGridProps {
  artworkId: number
  onClose: () => void
}

interface PositionedSimilarImage {
  artwork: SimilarArtwork
  x: number
  y: number
  width: number
  height: number
}

const CENTER_IMAGE_SIZE = 400

export function SimilarityDraggableGrid({ artworkId, onClose }: SimilarityDraggableGridProps) {
  const { data, isLoading, error } = useSimilarArtworks({ artworkId })
  const [positionedImages, setPositionedImages] = useState<PositionedSimilarImage[]>([])
  const [centerImage, setCenterImage] = useState<SimilarArtwork | null>(null)

  // Use the same viewport system as the main grid
  const { 
    translate, 
    isInitialized, 
    isDragging, 
    dragDistance,
    handleMouseDown, 
    handleTouchStart,
    containerRef,
    updatePosition 
  } = useViewport()

  // Process similarity data into grid layout
  useEffect(() => {
    if (!data?.success || !data.data.length) return

    // Find the original (center) image
    const original = data.data.find(artwork => artwork.original)
    if (original) {
      setCenterImage(original)
    }

    // Get similar images (excluding original)
    const similarImages = data.data.filter(artwork => !artwork.original)
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending

    // Arrange similar images in a grid around the center
    const positioned: PositionedSimilarImage[] = []
    const gridSpacing = COLUMN_WIDTH + GAP
    const centerOffset = CENTER_IMAGE_SIZE / 2 + gridSpacing
    
    // Create a spiral-like grid pattern around the center
    let currentRadius = 1
    let imagesPlaced = 0
    let angle = 0
    
    while (imagesPlaced < similarImages.length) {
      const imagesInRing = Math.max(8, currentRadius * 8) // More images in outer rings
      const angleStep = (2 * Math.PI) / imagesInRing
      
      for (let i = 0; i < imagesInRing && imagesPlaced < similarImages.length; i++) {
        const artwork = similarImages[imagesPlaced]!
        
        // Calculate grid position in a spiral
        const x = Math.cos(angle) * (centerOffset + currentRadius * gridSpacing)
        const y = Math.sin(angle) * (centerOffset + currentRadius * gridSpacing)
        
        // Image size based on similarity (more similar = larger)
        const baseSize = COLUMN_WIDTH
        const sizeMultiplier = 0.7 + (artwork.similarity * 0.6) // 0.7x to 1.3x based on similarity
        const imageSize = Math.floor(baseSize * sizeMultiplier)
        
        positioned.push({
          artwork,
          x: x,
          y: y,
          width: imageSize,
          height: Math.floor(imageSize / artwork.similarity) // Vary height slightly based on similarity
        })
        
        angle += angleStep
        imagesPlaced++
      }
      
      currentRadius++
      angle += Math.PI / 8 // Offset each ring slightly for better distribution
    }

    setPositionedImages(positioned)
  }, [data])

  // Handle image clicks
  const handleImageClick = useCallback((artwork: SimilarArtwork, event: React.MouseEvent) => {
    // Prevent click during dragging
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD) {
      return
    }
    
    event.stopPropagation()
    console.log('Similar artwork clicked:', artwork)
    // Could implement navigation to this artwork's similarity view or main grid
  }, [isDragging, dragDistance])

  // Handle trackpad navigation (same as main grid)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId = 0
    
    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey) return
      
      e.preventDefault()
      e.stopPropagation()
      
      const isTrackpadGesture = (
        Math.abs(e.deltaX) > 0 ||
        (Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50)
      )
      
      if (isTrackpadGesture) {
        const speed = TRACKPAD_SPEED
        const deltaX = -e.deltaX * speed
        const deltaY = -e.deltaY * speed
        
        if (rafId) cancelAnimationFrame(rafId)
        
        rafId = requestAnimationFrame(() => {
          if (deltaX !== 0 || deltaY !== 0) {
            updatePosition(deltaX, deltaY)
          }
        })
      }
    }
    
    container.addEventListener('wheel', handleWheelEvent, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheelEvent)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [containerRef, updatePosition])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white/10 rounded-lg p-8 text-white">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-lg">Finding similar artworks...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data?.success || !data.data.length) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Error</div>
            <div className="text-neutral-600 mb-4">
              {error?.message || 'Failed to load similar artworks'}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50" style={{ backgroundColor: GRID_BACKGROUND_COLOR }}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-colors"
        aria-label="Close similarity view"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Info overlay */}
      <div className="fixed top-4 left-4 z-10 bg-white/90 rounded-lg p-4 shadow-lg max-w-sm">
        <h2 className="font-semibold text-lg mb-2">Visual Similarity Explorer</h2>
        <p className="text-sm text-neutral-600 mb-3">
          Artworks similar to "{data.meta?.targetTitle}" by {data.meta?.targetArtist}
        </p>
        <div className="text-xs text-neutral-500">
          <div>• Center: Original artwork</div>
          <div>• Larger images: More similar</div>
          <div>• Drag to explore • Click images</div>
          <div>• Found {data.data.length - 1} similar artworks</div>
        </div>
      </div>

      {/* Draggable canvas */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ 
          touchAction: 'none',
          overscrollBehavior: 'none',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className={`relative w-full h-full ${
            isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
          }`}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px)`,
            willChange: isDragging ? 'transform' : 'auto',
          }}
        >
          {/* Center axes (like main grid) */}
          <div
            className="absolute pointer-events-none bg-black/20"
            style={{
              left: 0,
              top: -50000,
              width: 2,
              height: 100000,
              zIndex: 1
            }}
          />
          <div
            className="absolute pointer-events-none bg-black/20"
            style={{
              left: -50000,
              top: 0,
              width: 100000,
              height: 2,
              zIndex: 1
            }}
          />

          {/* Center image */}
          {centerImage && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl bg-white p-3 z-10"
              style={{
                left: '50%',
                top: '50%',
                width: CENTER_IMAGE_SIZE,
                height: CENTER_IMAGE_SIZE,
              }}
            >
              <img
                src={centerImage.imageUrl}
                alt={centerImage.title}
                className="w-full h-full object-cover rounded-xl"
                style={{ imageRendering: 'high-quality' }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl">
                <div className="p-4 text-white">
                  <div className="font-semibold text-base mb-1">{centerImage.title}</div>
                  <div className="text-white/90 text-sm">{centerImage.artist}</div>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                Original
              </div>
            </div>
          )}

          {/* Similar images in grid */}
          {positionedImages.map((positionedImage) => (
            <div
              key={positionedImage.artwork.id}
              className="absolute cursor-pointer hover:scale-105 transition-transform group rounded-lg shadow-lg bg-white p-1"
              style={{
                left: `calc(50% + ${positionedImage.x}px)`,
                top: `calc(50% + ${positionedImage.y}px)`,
                width: positionedImage.width,
                height: positionedImage.height,
                transform: 'translate(-50%, -50%)',
                zIndex: 2
              }}
              onClick={(e) => handleImageClick(positionedImage.artwork, e)}
            >
              <img
                src={positionedImage.artwork.imageUrl}
                alt={positionedImage.artwork.title}
                className="w-full h-full object-cover rounded"
                style={{ imageRendering: 'high-quality' }}
              />
              
              {/* Similarity badge */}
              <div className="absolute -top-1 -right-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow">
                {Math.round(positionedImage.artwork.similarity * 100)}%
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded">
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b">
                  <div className="p-2 text-white">
                    <div className="font-medium text-sm truncate">{positionedImage.artwork.title}</div>
                    <div className="text-white/80 text-xs truncate">{positionedImage.artwork.artist}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}