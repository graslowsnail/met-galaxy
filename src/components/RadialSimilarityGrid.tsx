/**
 * RadialSimilarityGrid - Interactive radial layout for similar images
 * 
 * Displays the clicked image large in the center, with similar images
 * arranged in concentric rings based on similarity scores.
 */

"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSimilarArtworks } from '@/hooks/use-similar-artworks'
import { useViewport } from './grid-legacy/grid/hooks/useViewport'
import type { SimilarArtwork } from '@/types/api'
import { GRID_BACKGROUND_COLOR } from './grid-legacy/grid/utils/constants'

interface RadialSimilarityGridProps {
  artworkId: number
  onClose: () => void
}

interface RadialImage {
  artwork: SimilarArtwork
  x: number
  y: number
  size: number
  ring: number
}

// Ring configuration
const RINGS = [
  { minSimilarity: 0.8, maxSimilarity: 1.0, radius: 400, imageSize: 180, label: "Very Similar" },
  { minSimilarity: 0.6, maxSimilarity: 0.8, radius: 650, imageSize: 140, label: "Similar" },
  { minSimilarity: 0.4, maxSimilarity: 0.6, radius: 900, imageSize: 120, label: "Somewhat Similar" },
  { minSimilarity: 0.0, maxSimilarity: 0.4, radius: 1150, imageSize: 100, label: "Less Similar" },
]

const CENTER_IMAGE_SIZE = 320

export function RadialSimilarityGrid({ artworkId, onClose }: RadialSimilarityGridProps) {
  const { data, isLoading, error } = useSimilarArtworks({ artworkId })
  const [radialImages, setRadialImages] = useState<RadialImage[]>([])
  const [centerImage, setCenterImage] = useState<SimilarArtwork | null>(null)

  // Use the same viewport system as the main grid
  const { 
    translate, 
    isInitialized, 
    isDragging, 
    handleMouseDown, 
    handleTouchStart,
    containerRef 
  } = useViewport()

  // Process similarity data into radial layout
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

    // Arrange images in rings based on similarity
    const positioned: RadialImage[] = []
    
    RINGS.forEach((ring, ringIndex) => {
      const imagesForRing = similarImages.filter(img => 
        img.similarity >= ring.minSimilarity && img.similarity < ring.maxSimilarity
      )

      // Arrange images in a circle
      imagesForRing.forEach((artwork, index) => {
        const angleStep = (2 * Math.PI) / Math.max(imagesForRing.length, 8)
        const angle = index * angleStep
        
        // Add some randomness to avoid perfect circles
        const radiusVariation = (Math.random() - 0.5) * 60
        const angleVariation = (Math.random() - 0.5) * 0.3
        
        const finalRadius = ring.radius + radiusVariation
        const finalAngle = angle + angleVariation
        
        positioned.push({
          artwork,
          x: Math.cos(finalAngle) * finalRadius,
          y: Math.sin(finalAngle) * finalRadius,
          size: ring.imageSize,
          ring: ringIndex
        })
      })
    })

    setRadialImages(positioned)
  }, [data])

  // Handle image clicks
  const handleImageClick = useCallback((artwork: SimilarArtwork, event: React.MouseEvent) => {
    event.stopPropagation()
    console.log('Similar artwork clicked:', artwork)
    // Could implement navigation to this artwork's similarity view
  }, [])

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
        <h2 className="font-semibold text-lg mb-2">Visual Similarity</h2>
        <p className="text-sm text-neutral-600 mb-3">
          Explore artworks similar to "{data.meta?.targetTitle}" by {data.meta?.targetArtist}
        </p>
        <div className="text-xs text-neutral-500">
          <div>• Center: Original artwork</div>
          <div>• Inner rings: Most similar</div>
          <div>• Outer rings: Less similar</div>
          <div>• Drag to explore</div>
        </div>
      </div>

      {/* Draggable canvas */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ 
          touchAction: 'none',
          overscrollBehavior: 'none'
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
          {/* Ring guides (subtle circles) */}
          {RINGS.map((ring, index) => (
            <div
              key={index}
              className="absolute border border-white/10 rounded-full pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                width: ring.radius * 2,
                height: ring.radius * 2,
                marginLeft: -ring.radius,
                marginTop: -ring.radius,
              }}
            />
          ))}

          {/* Center image */}
          {centerImage && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl bg-white p-2"
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
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl">
                <div className="p-3 text-white">
                  <div className="font-medium text-sm truncate">{centerImage.title}</div>
                  <div className="text-white/80 text-xs truncate">{centerImage.artist}</div>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Original
              </div>
            </div>
          )}

          {/* Similar images in rings */}
          {radialImages.map((radialImage, index) => (
            <div
              key={radialImage.artwork.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-lg bg-white p-1 cursor-pointer hover:scale-105 transition-transform group"
              style={{
                left: `calc(50% + ${radialImage.x}px)`,
                top: `calc(50% + ${radialImage.y}px)`,
                width: radialImage.size,
                height: radialImage.size,
              }}
              onClick={(e) => handleImageClick(radialImage.artwork, e)}
            >
              <img
                src={radialImage.artwork.imageUrl}
                alt={radialImage.artwork.title}
                className="w-full h-full object-cover rounded"
              />
              
              {/* Similarity badge */}
              <div className="absolute -top-1 -right-1 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
                {Math.round(radialImage.artwork.similarity * 100)}%
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded">
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b">
                  <div className="p-2 text-white">
                    <div className="font-medium text-xs truncate">{radialImage.artwork.title}</div>
                    <div className="text-white/80 text-xs truncate">{radialImage.artwork.artist}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ring labels */}
      <div className="fixed bottom-4 right-4 bg-white/90 rounded-lg p-3 shadow-lg">
        <div className="text-xs font-medium mb-2">Similarity Rings</div>
        {RINGS.map((ring, index) => (
          <div key={index} className="flex items-center gap-2 text-xs text-neutral-600 mb-1">
            <div 
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: `hsl(${120 - index * 30}, 60%, 50%)` }}
            />
            <span>{ring.label}</span>
            <span className="text-neutral-400">
              ({Math.round(ring.minSimilarity * 100)}-{Math.round(ring.maxSimilarity * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}