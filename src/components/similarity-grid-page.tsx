"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSimilarArtworks } from '@/hooks/use-similar-artworks'
import type { SimilarArtwork } from '@/types/api'
import type { ImageItem } from './grid/types/grid'
import { GRID_BACKGROUND_COLOR } from './grid/utils/constants'

interface SimilarityGridPageProps {
  artworkId: number
  onClose: () => void
}

export function SimilarityGridPage({ artworkId, onClose }: SimilarityGridPageProps) {
  const { data, isLoading, error } = useSimilarArtworks({ artworkId })
  const [originalArtwork, setOriginalArtwork] = useState<SimilarArtwork | null>(null)
  const [similarArtworks, setSimilarArtworks] = useState<SimilarArtwork[]>([])

  // Process data when it loads
  useEffect(() => {
    if (data?.success && data.data.length > 0) {
      const original = data.data.find(artwork => artwork.original)
      const similar = data.data.filter(artwork => !artwork.original)
        .sort((a, b) => b.similarity - a.similarity)
      
      setOriginalArtwork(original || null)
      setSimilarArtworks(similar)
    }
  }, [data])

  // Handle artwork click to navigate to a new similarity view
  const handleArtworkClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (image.databaseId) {
      // For now, just log the click - we could implement navigation later
      console.log('Similarity artwork clicked:', {
        imageId: image.id,
        databaseId: image.databaseId,
        title: image.title,
        artist: image.artist
      })
    }
  }, [])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-lg">Finding similar artworks...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Error</div>
            <div className="text-neutral-600 mb-4">
              {error.message || 'Failed to load similar artworks'}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!originalArtwork || similarArtworks.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-neutral-800 text-lg font-medium mb-2">No Similar Artworks</div>
            <div className="text-neutral-600 mb-4">
              Similarity search is not available for this artwork.
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
    <div className="fixed inset-0 z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-neutral-200">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-800">
              Similar Artworks
            </h1>
            {data?.meta && (
              <p className="text-sm text-neutral-600">
                {data.meta.count} similar artworks to "{data.meta.targetTitle}" by {data.meta.targetArtist}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: GRID_BACKGROUND_COLOR }}
      >
        <CenteredSimilarityGrid
          originalArtwork={originalArtwork}
          similarArtworks={similarArtworks}
          onArtworkClick={handleArtworkClick}
        />
      </div>
    </div>
  )
}

interface CenteredSimilarityGridProps {
  originalArtwork: SimilarArtwork
  similarArtworks: SimilarArtwork[]
  onArtworkClick: (image: ImageItem, event: React.MouseEvent) => void
}

function CenteredSimilarityGrid({ 
  originalArtwork, 
  similarArtworks, 
  onArtworkClick 
}: CenteredSimilarityGridProps) {
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Handle mouse/touch events for dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: event.clientX - translate.x, y: event.clientY - translate.y })
  }, [translate])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Calculate layout positions
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  
  // Original artwork in center
  const originalSize = 300
  const originalX = centerX - originalSize / 2 + translate.x
  const originalY = centerY - originalSize / 2 + translate.y

  // Check if two artworks would overlap
  const wouldOverlap = (pos1: { x: number; y: number; size: number }, pos2: { x: number; y: number; size: number }) => {
    const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2))
    const minDistance = (pos1.size + pos2.size) / 2 + 10 // Add 10px buffer
    return distance < minDistance
  }

  // Arrange similar artworks in a spiral pattern around the center with no overlap
  const getSimilarArtworkPosition = (index: number, total: number) => {
    // Use golden angle for better distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // ~137.5 degrees
    const angle = index * goldenAngle
    
    // Calculate radius based on index to ensure proper spacing
    const radius = 350 + (index * 30) // Even more spacing between rings
    
    const x = centerX + Math.cos(angle) * radius + translate.x
    const y = centerY + Math.sin(angle) * radius + translate.y
    
    // Size based on similarity (more similar = larger)
    const similarity = similarArtworks[index]?.similarity || 0
    const size = 90 + (similarity * 50) // Smaller range: 90-140px to reduce overlap
    
    return { x, y, size }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseDown={handleMouseDown}
    >
      {/* Original Artwork (Center) */}
      <div
        className="absolute cursor-pointer hover:scale-105 transition-transform duration-200"
        style={{
          left: originalX,
          top: originalY,
          width: originalSize,
          height: originalSize,
        }}
        onClick={(e) => {
          const imageItem: ImageItem = {
            id: `original-${originalArtwork.id}`,
            src: originalArtwork.imageUrl,
            width: originalSize,
            height: originalSize,
            aspectRatio: 1,
            chunkX: 0,
            chunkY: 0,
            localIndex: 0,
            databaseId: originalArtwork.id,
            objectId: originalArtwork.objectId,
            title: originalArtwork.title,
            artist: originalArtwork.artist,
          }
          onArtworkClick(imageItem, e)
        }}
      >
        <div className="relative w-full h-full">
          <img
            src={originalArtwork.imageUrl}
            alt={originalArtwork.title}
            className="w-full h-full object-cover rounded-lg shadow-lg border-4 border-white"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="font-semibold text-lg truncate" title={originalArtwork.title}>
              {originalArtwork.title}
            </div>
            <div className="text-white/90 text-sm truncate" title={originalArtwork.artist}>
              {originalArtwork.artist}
            </div>
            <div className="inline-flex items-center px-2 py-1 bg-white/20 text-white text-xs rounded-full mt-1">
              Original artwork
            </div>
          </div>
        </div>
      </div>

      {/* Similar Artworks */}
      {similarArtworks.map((artwork, index) => {
        const position = getSimilarArtworkPosition(index, similarArtworks.length)
        
        return (
          <div
            key={artwork.id}
            className="absolute cursor-pointer hover:scale-110 transition-transform duration-200"
            style={{
              left: position.x - position.size / 2,
              top: position.y - position.size / 2,
              width: position.size,
              height: position.size,
            }}
            onClick={(e) => {
              const imageItem: ImageItem = {
                id: `similar-${artwork.id}`,
                src: artwork.imageUrl,
                width: position.size,
                height: position.size,
                aspectRatio: 1,
                chunkX: 0,
                chunkY: 0,
                localIndex: index,
                databaseId: artwork.id,
                objectId: artwork.objectId,
                title: artwork.title,
                artist: artwork.artist,
              }
              onArtworkClick(imageItem, e)
            }}
          >
            <div className="relative w-full h-full group">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                className="w-full h-full object-cover rounded-lg shadow-md border-2 border-white/50 group-hover:border-white transition-colors"
              />
              
              {/* Similarity badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                {Math.round(artwork.similarity * 100)}%
              </div>
              
              {/* Rank badge */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                #{index + 1}
              </div>
              
              {/* Info overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg">
                <div className="absolute bottom-2 left-2 right-2 text-white">
                  <div className="font-medium text-sm truncate" title={artwork.title}>
                    {artwork.title}
                  </div>
                  <div className="text-white/80 text-xs truncate" title={artwork.artist}>
                    {artwork.artist}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm text-neutral-600">
          <div className="font-medium mb-1">How to use:</div>
          <div>• Drag to pan around the similarity view</div>
          <div>• Click any artwork to view details</div>
          <div>• Larger artworks are more similar</div>
        </div>
      </div>
    </div>
  )
}
