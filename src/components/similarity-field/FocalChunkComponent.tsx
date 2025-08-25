/**
 * FocalChunkComponent - Renders the focal chunk with a single prominent image
 * 
 * This component renders the focal chunk (0,0) differently from regular chunks.
 * Instead of showing 20 duplicated images, it displays a single, prominently
 * styled focal image at the center of the chunk area.
 */

import React, { memo, useState } from 'react'
import type { ChunkComponentProps, ImageItem } from '../grid-legacy/grid/types/grid'
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT,
  FOCAL_IMAGE_SCALE,
  FOCAL_IMAGE_BORDER_RADIUS,
  FOCAL_IMAGE_SHADOW,
  FOCAL_CHUNK_BACKGROUND,
  DEBUG_LOGGING
} from './utils/constants'

/**
 * Focal image component with special styling
 */
const FocalImage = memo(function FocalImage({ 
  image, 
  position,
  onImageClick, 
  isDragging 
}: {
  image: ImageItem
  position: import('../grid-legacy/grid/types/grid').PositionedImage
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  isDragging?: boolean
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!isDragging && onImageClick) {
      onImageClick(image, event)
    }
  }

  const handleLoad = () => {
    setIsLoaded(true)
    setHasError(false)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoaded(false)
    if (DEBUG_LOGGING) {
      console.error(`❌ Focal image failed to load: ${image.src}`)
    }
  }

  // Center the image within the chunk using its natural dimensions
  const centerX = CHUNK_WIDTH / 2
  const centerY = CHUNK_HEIGHT / 2
  
  // Position the image at the center (the image will size itself naturally)
  const imageX = centerX
  const imageY = centerY

  return (
    <div
      style={{
        position: 'absolute',
        left: imageX,
        top: imageY,
        cursor: isDragging ? 'grabbing' : 'pointer',
        transition: isDragging ? 'none' : 'all 0.2s ease-out',
        transform: `translate(-50%, -50%) scale(${FOCAL_IMAGE_SCALE}) ${isHovered && !isDragging ? 'scale(1.02)' : ''}`,
        transformOrigin: 'center center',
        zIndex: 10
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!hasError ? (
        <img
          src={image.src}
          alt={image.title || 'Focal artwork'}
          style={{
            // Let image render at its natural dimensions
            display: 'block',
            borderRadius: FOCAL_IMAGE_BORDER_RADIUS,
            boxShadow: isHovered && !isDragging ? 
              '0 20px 40px -10px rgb(0 0 0 / 0.25), 0 8px 20px -4px rgb(0 0 0 / 0.15)' : 
              FOCAL_IMAGE_SHADOW,
            transition: isDragging ? 'none' : 'all 0.2s ease-out',
            opacity: isLoaded ? 1 : 0
          }}
          onLoad={handleLoad}
          onError={handleError}
          loading="eager"
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f5f5f5',
            borderRadius: FOCAL_IMAGE_BORDER_RADIUS,
            boxShadow: FOCAL_IMAGE_SHADOW,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px'
          }}
        >
          Image unavailable
        </div>
      )}
      
      {!isLoaded && !hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f5f5f5',
            borderRadius: FOCAL_IMAGE_BORDER_RADIUS,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px'
          }}
        >
          Loading...
        </div>
      )}
    </div>
  )
})

/**
 * Focal chunk component - renders a single prominent focal image
 */
const FocalChunkComponent = memo(function FocalChunkComponent({
  chunk,
  onImageClick,
  isDragging = false
}: ChunkComponentProps) {
  const pixelX = chunk.x * CHUNK_WIDTH
  const pixelY = chunk.y * CHUNK_HEIGHT

  // Get the focal image (should be the first and only image)
  const focalImage = chunk.images[0]
  const focalPosition = chunk.positions[0]

  if (!focalImage || !focalPosition) {
    if (DEBUG_LOGGING) {
      console.warn(`🎯 FocalChunkComponent: No focal image or position found in chunk ${chunk.x},${chunk.y}`)
    }
    return null
  }

  if (DEBUG_LOGGING) {
    console.log(`🎯 Rendering focal chunk ${chunk.x},${chunk.y} with image:`, focalImage.title)
    console.log(`🎯 Focal image position:`, focalPosition)
    console.log(`🎯 Chunk pixel position: (${pixelX}, ${pixelY})`)
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: pixelX,
        top: pixelY,
        width: CHUNK_WIDTH,
        height: CHUNK_HEIGHT,
        // No background - let it blend with the main background
        pointerEvents: isDragging ? 'none' : 'auto'
      }}
    >
      <FocalImage
        image={focalImage}
        position={focalPosition}
        onImageClick={onImageClick}
        isDragging={isDragging}
      />
      
      {/* Optional focal indicator */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}
      >
        FOCAL
      </div>
    </div>
  )
})

FocalChunkComponent.displayName = 'FocalChunkComponent'

export default FocalChunkComponent