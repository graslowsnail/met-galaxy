/**
 * Similarity field specific chunk component
 * Based on ChunkComponent but uses similarity field constants for correct positioning
 */

import React, { memo } from 'react'
import type { Chunk, ImageItem } from '../grid-legacy/grid/types/grid'
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT, 
  GRID_ORIGIN_X, 
  GRID_ORIGIN_Y,
  COLUMN_WIDTH,
  GAP,
  AXIS_MARGIN,
  COLUMNS_PER_CHUNK,
  SHOW_CHUNK_BOUNDARIES 
} from './utils/constants'
import { 
  IMAGE_BORDER_RADIUS, 
  IMAGE_SHADOW,
  CHUNK_BORDER_COLOR 
} from '../grid-legacy/grid/utils/constants'

interface SimilarityChunkComponentProps {
  chunk: Chunk
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  isDragging?: boolean
  showBoundary?: boolean
}

const SimilarityChunkComponent = memo(function SimilarityChunkComponent({
  chunk,
  onImageClick,
  isDragging = false,
  showBoundary = SHOW_CHUNK_BOUNDARIES
}: SimilarityChunkComponentProps) {
  const { x: chunkX, y: chunkY, images, positions } = chunk
  
  // Calculate the actual cell width used in the grid layout
  const cellWidth = (CHUNK_WIDTH - (2 * AXIS_MARGIN) - ((COLUMNS_PER_CHUNK - 1) * GAP)) / COLUMNS_PER_CHUNK
  
  // Debug: log the calculated dimensions (remove this later)
  // if (chunkX === 1 && chunkY === 0 && images.length > 0) {
  //   console.log(`🖼️ Similarity chunk (${chunkX},${chunkY}): cellWidth=${cellWidth}, CHUNK_WIDTH=${CHUNK_WIDTH}, COLUMN_WIDTH=${COLUMN_WIDTH}`)
  //   console.log(`   First position:`, positions[0])
  // }

  const handleImageClick = (image: ImageItem, event: React.MouseEvent) => {
    if (isDragging || !onImageClick) return
    event.preventDefault()
    event.stopPropagation()
    onImageClick(image, event)
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Hide the image if it fails to load
    const target = e.target as HTMLImageElement
    target.style.display = 'none'
    
    // Optionally show a simple error placeholder
    const parent = target.parentElement
    if (parent && !parent.querySelector('.error-placeholder')) {
      const errorDiv = document.createElement('div')
      errorDiv.className = 'error-placeholder flex items-center justify-center w-full h-full bg-gray-100 text-gray-400 text-sm'
      errorDiv.textContent = 'Image unavailable'
      parent.appendChild(errorDiv)
    }
  }

  return (
    <div
      className="absolute"
      style={{
        left: GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH),
        top: GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT),
        width: CHUNK_WIDTH,
        height: CHUNK_HEIGHT,
      }}
    >
      {/* Chunk boundary (for debugging) */}
      {showBoundary && (
        <div
          className="absolute pointer-events-none border-dashed opacity-30"
          style={{
            left: 0,
            top: 0,
            width: CHUNK_WIDTH,
            height: CHUNK_HEIGHT,
            borderColor: CHUNK_BORDER_COLOR,
            borderWidth: 1,
            zIndex: 0,
          }}
        />
      )}

      {/* Images */}
      {images.map((image, index) => {
        const position = positions[index]
        if (!position) return null

        return (
          <div
            key={image.id}
            className="absolute bg-white overflow-hidden border border-neutral-200 hover:shadow-md transition-shadow duration-200 group cursor-pointer"
            style={{
              left: position.x,
              top: position.y,
              width: cellWidth,
              height: position.height,
              borderRadius: IMAGE_BORDER_RADIUS,
              boxShadow: IMAGE_SHADOW.default,
            }}
            onClick={(e) => handleImageClick(image, e)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = IMAGE_SHADOW.hover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = IMAGE_SHADOW.default
            }}
          >
            <img
              src={image.src}
              alt={image.title ?? `Artwork ${image.id}`}
              className="w-full h-full object-cover pointer-events-none select-none"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
              }}
              draggable={false}
              loading="lazy"
              onError={handleError}
            />
            
            {/* Metadata overlay on hover */}
            {(image.title ?? image.artist) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="p-2 text-white text-xs">
                  {image.title && (
                    <div className="font-medium truncate" title={image.title}>
                      {image.title}
                    </div>
                  )}
                  {image.artist && (
                    <div className="text-white/80 truncate" title={image.artist}>
                      {image.artist}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

export default SimilarityChunkComponent