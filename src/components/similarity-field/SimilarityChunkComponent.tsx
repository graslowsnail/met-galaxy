/**
 * Similarity field specific chunk component
 * Based on ChunkComponent but uses similarity field constants for correct positioning
 */

import { memo, useState } from 'react'
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
  CHUNK_BORDER_COLOR,
  CLICK_MOVE_THRESHOLD
} from '../grid-legacy/grid/utils/constants'

interface SimilarityChunkComponentProps {
  chunk: Chunk
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  isDragging?: boolean
  dragDistance?: number
  showBoundary?: boolean
}

const SimilarityChunkComponent = memo(function SimilarityChunkComponent({
  chunk,
  onImageClick,
  isDragging = false,
  dragDistance = 0,
  showBoundary = SHOW_CHUNK_BOUNDARIES
}: SimilarityChunkComponentProps) {
  const { x: chunkX, y: chunkY, images, positions } = chunk
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null)
  
  // Use the column width directly for masonry layout
  const cellWidth = COLUMN_WIDTH
  
  // Debug: log the calculated dimensions (remove this later)
  // if (chunkX === 1 && chunkY === 0 && images.length > 0) {
  //   console.log(`🖼️ Similarity chunk (${chunkX},${chunkY}): cellWidth=${cellWidth}, CHUNK_WIDTH=${CHUNK_WIDTH}, COLUMN_WIDTH=${COLUMN_WIDTH}`)
  //   console.log(`   First position:`, positions[0])
  // }

  const handleImageClick = (image: ImageItem, event: React.MouseEvent) => {
    // Prevent click during dragging OR if mouse moved significantly
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD || !onImageClick) return
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

        const isHovered = hoveredImageId === image.id

        return (
          <div
            key={image.id}
            className="absolute cursor-pointer group"
            style={{
              left: position.x,
              top: position.y,
              width: cellWidth,
              height: position.height,
              borderRadius: IMAGE_BORDER_RADIUS,
              transformOrigin: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: isHovered ? 500 : 1,
            }}
            onClick={(e) => handleImageClick(image, e)}
            onMouseEnter={() => {
              if (!isDragging) {
                setHoveredImageId(image.id)
              }
            }}
            onMouseLeave={() => {
              setHoveredImageId(null)
            }}
          >
            {/* Main container that transforms on hover */}
            <div
              className="relative w-full h-full transition-all duration-300 ease-out"
              style={{
                transform: isHovered ? 'scale(1.25) translateY(-12px)' : 'scale(1)',
                boxShadow: isHovered 
                  ? '0 36px 72px -18px rgba(0,0,0,0.55), 0 20px 40px -12px rgba(0,0,0,0.35)' 
                  : 'none',
                filter: isHovered ? 'saturate(1.08) contrast(1.06)' : 'none',
                borderRadius: IMAGE_BORDER_RADIUS,
              }}
            >
              {isHovered && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: IMAGE_BORDER_RADIUS,
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.95), 0 0 40px rgba(255,255,255,0.38)'
                  }}
                />
              )}
              {/* Background for full image */}
              <div 
                className="w-full h-full overflow-hidden"
                style={{ 
                  borderRadius: IMAGE_BORDER_RADIUS
                }}
              >
                <img
                  src={image.src}
                  alt={image.title ?? `Artwork ${image.id}`}
                  className="w-full h-full pointer-events-none select-none transition-all duration-300"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    
                  }}
                  draggable={false}
                  loading="lazy"
                  onError={handleError}
                />
              </div>

              {/* Enhanced metadata overlay */}
              {isHovered && (image.title || image.artist) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-2 pb-1 pt-2 pointer-events-none rounded-b-lg">
                  {image.title && (
                    <div className="text-white font-semibold text-sm md:text-base mb-0.5 leading-tight line-clamp-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {image.title}
                    </div>
                  )}
                  {image.artist && (
                    <div className="text-white/80 text-[10px] md:text-xs">
                      {image.artist}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})

export default SimilarityChunkComponent