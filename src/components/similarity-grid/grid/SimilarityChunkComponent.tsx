/**
 * Similarity Chunk Component
 * 
 * Renders individual chunks in the similarity grid. Similar to the main grid's
 * ChunkComponent but with similarity-specific styling and layout.
 */

import React from 'react'
import type { SimilarityChunk, SimilarityImageItem } from './types/similarity'
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT,
  FOCAL_IMAGE_RING_WIDTH,
  FOCAL_IMAGE_RING_COLOR,
  HOVER_SCALE,
  HOVER_TRANSITION,
  SHOW_CHUNK_BOUNDARIES,
  SHOW_SIMILARITY_SCORES,
  DEBUG_LOGGING
} from './utils/constants'
import { chunkToWorldCoordinates } from './utils/chunkCalculations'

interface SimilarityChunkComponentProps {
  chunk: SimilarityChunk
  isLoading: boolean
  error: Error | null
  onImageClick: (image: SimilarityImageItem) => void
  showLoadingIndicators?: boolean
}

export function SimilarityChunkComponent({
  chunk,
  isLoading,
  error,
  onImageClick,
  showLoadingIndicators = true
}: SimilarityChunkComponentProps) {
  
  const worldPos = chunkToWorldCoordinates(chunk.x, chunk.y)
  
  // ============================================================================
  // ERROR STATE
  // ============================================================================
  
  if (error) {
    return (
      <div
        className="absolute bg-red-100 border border-red-300 rounded-lg flex items-center justify-center"
        style={{
          left: worldPos.x,
          top: worldPos.y,
          width: CHUNK_WIDTH,
          height: CHUNK_HEIGHT,
        }}
      >
        <div className="text-red-600 text-center p-4">
          <div className="font-medium mb-2">Error loading chunk</div>
          <div className="text-sm">{error.message}</div>
          <button 
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // LOADING STATE
  // ============================================================================
  
  if (isLoading && showLoadingIndicators) {
    return (
      <div
        className="absolute bg-gray-100 border border-gray-200 rounded-lg"
        style={{
          left: worldPos.x,
          top: worldPos.y,
          width: CHUNK_WIDTH,
          height: CHUNK_HEIGHT,
        }}
      >
        {/* Loading skeleton */}
        <div className="p-4 space-y-4 animate-pulse">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i}
                className="aspect-square bg-gray-300 rounded-lg"
                style={{
                  width: Math.random() > 0.5 ? '120px' : '180px',
                  height: Math.random() > 0.5 ? '120px' : '180px'
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">Loading similar images...</span>
          </div>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // NORMAL RENDERING
  // ============================================================================
  
  return (
    <div
      className={`absolute ${SHOW_CHUNK_BOUNDARIES ? 'border-2 border-blue-300 border-dashed' : ''}`}
      style={{
        left: worldPos.x,
        top: worldPos.y,
        width: CHUNK_WIDTH,
        height: CHUNK_HEIGHT,
      }}
    >
      {/* Chunk background for debugging */}
      {DEBUG_LOGGING && (
        <div className="absolute inset-0 bg-black/5 rounded-lg border border-gray-300">
          <div className="absolute top-2 left-2 text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded">
            Chunk ({chunk.x}, {chunk.y}) - {chunk.chunkType}
            <br />
            {chunk.images.length} images
            {chunk.averageSimilarity && (
              <>, avg: {chunk.averageSimilarity.toFixed(2)}</>
            )}
          </div>
        </div>
      )}
      
      {/* Render images */}
      {chunk.images.map((image) => (
        <SimilarityImageComponent
          key={image.id}
          image={image}
          chunkWorldPos={worldPos}
          onClick={onImageClick}
        />
      ))}
    </div>
  )
}

// ============================================================================
// INDIVIDUAL IMAGE COMPONENT
// ============================================================================

interface SimilarityImageComponentProps {
  image: SimilarityImageItem
  chunkWorldPos: { x: number; y: number }
  onClick: (image: SimilarityImageItem) => void
}

function SimilarityImageComponent({ image, chunkWorldPos, onClick }: SimilarityImageComponentProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(image)
  }
  
  return (
    <div
      className={`
        absolute cursor-pointer group
        ${image.isFocal 
          ? `ring-${FOCAL_IMAGE_RING_WIDTH} ring-opacity-70 shadow-2xl z-20` 
          : 'shadow-lg hover:shadow-xl z-10'
        }
      `}
      style={{
        left: image.x - chunkWorldPos.x, // Make relative to current chunk
        top: image.y - chunkWorldPos.y,
        width: image.width,
        height: image.height,
        transform: `scale(1)`,
        transition: HOVER_TRANSITION,
        borderColor: image.isFocal ? FOCAL_IMAGE_RING_COLOR : undefined
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!image.isFocal) {
          e.currentTarget.style.transform = `scale(${HOVER_SCALE})`
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Image */}
      <img
        src={image.imageUrl}
        alt={`${image.title} by ${image.artist}`}
        className="w-full h-full object-cover rounded-lg"
        loading="lazy"
        onError={(e) => {
          const img = e.target as HTMLImageElement
          img.style.backgroundColor = '#f3f4f6'
          img.style.display = 'none'
        }}
      />
      
      {/* Image overlay with info */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-colors rounded-lg flex items-end p-2">
        <div className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="font-medium truncate">{image.title}</p>
          <p className="text-gray-200 text-xs truncate">{image.artist}</p>
          {SHOW_SIMILARITY_SCORES && image.similarity !== undefined && (
            <p className="text-blue-200 text-xs">
              {Math.round(image.similarity * 100)}% similar
            </p>
          )}
          {image.imageType !== 'focal' && (
            <p className="text-gray-400 text-xs capitalize">
              {image.imageType} • {image.gridSize}
            </p>
          )}
        </div>
      </div>
      
      {/* Focal image indicator */}
      {image.isFocal && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
          Focal
        </div>
      )}
      
      {/* Similarity badge for non-focal images */}
      {!image.isFocal && image.similarity !== undefined && image.similarity > 0.8 && (
        <div className="absolute -top-1 -left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded shadow">
          {Math.round(image.similarity * 100)}%
        </div>
      )}
    </div>
  )
}