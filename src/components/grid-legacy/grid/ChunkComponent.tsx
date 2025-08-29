/**
 * ChunkComponent - Renders an individual chunk with optimized performance
 * 
 * This component handles the rendering of a single chunk containing multiple images.
 * It's wrapped with React.memo for optimal performance and includes all image
 * interactions, error handling, and hover effects.
 */

import { memo, useState, useEffect } from 'react'
import type { ChunkComponentProps } from './types/grid'
import { 
  GRID_ORIGIN_X, 
  GRID_ORIGIN_Y, 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT,
  COLUMN_WIDTH,
  Z_INDEX_CHUNK_OUTLINE,
  Z_INDEX_IMAGES,
  CHUNK_BORDER_COLOR,
  IMAGE_BORDER_RADIUS,
  IMAGE_SHADOW
} from './utils/constants'

/**
 * Individual image component within a chunk
 */
const ImageItem = memo(function ImageItem({ 
  image, 
  position, 
  chunkX, 
  chunkY, 
  onImageClick, 
  isDragging 
}: {
  image: import('./types/grid').ImageItem
  position: import('./types/grid').PositionedImage
  chunkX: number
  chunkY: number
  onImageClick?: (image: import('./types/grid').ImageItem, event: React.MouseEvent) => void
  isDragging?: boolean
}) {
  const handleClick = (event: React.MouseEvent) => {
    // Prevent click during dragging
    if (isDragging) return
    
    // Stop event propagation to prevent triggering drag
    event.stopPropagation()
    
    onImageClick?.(image, event)
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
      className="absolute bg-white overflow-hidden border border-neutral-200 hover:shadow-md transition-shadow duration-200 group cursor-pointer"
      style={{
        left: position.x - (GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)),
        top: position.y - (GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)),
        width: image.width,
        height: position.height,
        borderRadius: IMAGE_BORDER_RADIUS,
        boxShadow: IMAGE_SHADOW.default,
      }}
      onClick={handleClick}
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
            {image.date && (
              <div className="text-white/60 text-xs truncate">
                {image.date}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

/**
 * Main chunk component that renders a complete chunk with all its images
 */
const ChunkComponent = memo(function ChunkComponent({
  chunk,
  isLoading = false,
  onImageClick,
  isDragging = false,
  showBoundary = false
}: ChunkComponentProps & { showBoundary?: boolean }) {
  
  // Fade-in animation state
  const [isVisible, setIsVisible] = useState(false)
  
  // Trigger fade-in animation when chunk first appears
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50) // Small delay to ensure smooth animation
    
    return () => clearTimeout(timer)
  }, [])
  
  // Early return if chunk has no valid positions
  if (!chunk.positions || chunk.positions.length === 0) {
    return null
  }

  const chunkLeft = GRID_ORIGIN_X + (chunk.x * CHUNK_WIDTH)
  const chunkTop = GRID_ORIGIN_Y + (chunk.y * CHUNK_HEIGHT)

  return (
    <div key={`container-${chunk.id}`}>
      {/* Chunk boundary outline (optional for debugging) */}
      {showBoundary && (
        <div
          className="absolute pointer-events-none border border-dashed"
          style={{
            left: chunkLeft,
            top: chunkTop,
            width: CHUNK_WIDTH,
            height: CHUNK_HEIGHT,
            borderColor: CHUNK_BORDER_COLOR,
            zIndex: Z_INDEX_CHUNK_OUTLINE
          }}
        />
      )}
      
      {/* Clipping container for images */}
      <div
        className={`absolute overflow-hidden transition-all duration-500 ease-out transform ${
          isVisible 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95'
        } ${
          isLoading ? 'opacity-50' : ''
        }`}
        style={{
          left: chunkLeft,
          top: chunkTop,
          width: CHUNK_WIDTH,
          height: CHUNK_HEIGHT,
          zIndex: Z_INDEX_IMAGES,
        }}
      >
        {chunk.images.map((image, index) => {
          const position = chunk.positions[index]
          
          // Skip invalid positions
          if (!position?.height || position.height <= 0 || !isFinite(position.height)) {
            return null
          }
          
          return (
            <ImageItem
              key={image.id}
              image={image}
              position={position}
              chunkX={chunk.x}
              chunkY={chunk.y}
              onImageClick={onImageClick}
              isDragging={isDragging}
            />
          )
        })}
      </div>
      
      {/* Loading indicator overlay */}
      {isLoading && (
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            left: chunkLeft,
            top: chunkTop,
            width: CHUNK_WIDTH,
            height: CHUNK_HEIGHT,
            zIndex: Z_INDEX_IMAGES + 1,
          }}
        >
          <div className="bg-white/90 rounded-full px-3 py-1 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <div className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              Loading...
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

// Add display names for better debugging
ChunkComponent.displayName = 'ChunkComponent'
ImageItem.displayName = 'ImageItem'

export default ChunkComponent
export { ImageItem }
