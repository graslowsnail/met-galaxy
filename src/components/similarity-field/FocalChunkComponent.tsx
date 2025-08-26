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
import { CLICK_MOVE_THRESHOLD } from '../grid-legacy/grid/utils/constants'

/**
 * Focal image component with special styling
 */
const FocalImage = memo(function FocalImage({ 
  image, 
  position,
  onImageClick, 
  isDragging,
  dragDistance,
  focalArtwork
}: {
  image: ImageItem
  position: import('../grid-legacy/grid/types/grid').PositionedImage
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  isDragging?: boolean
  dragDistance?: number
  focalArtwork?: {
    title: string | null
    artist: string | null
    date?: string | null
    department?: string | null
    creditLine?: string | null
    description?: string | null
    objectUrl?: string | null
  }
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    // Prevent click during dragging OR if mouse moved significantly
    if (!isDragging && (dragDistance ?? 0) <= CLICK_MOVE_THRESHOLD) {
      // Toggle modal for focal image
      setShowModal(prev => !prev)
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

  const formatField = (label: string, value: string | null | undefined) => {
    if (!value || value.trim() === '') return null
    return (
      <div key={label} className="mb-2">
        <span className="text-white/70 text-sm">{label}:</span>
        <span className="text-white/90 text-sm ml-2">{value}</span>
      </div>
    )
  }

  // If modal is open, show artwork info instead of image
  if (showModal) {
    const fields = focalArtwork ? [
      formatField("Artist", focalArtwork.artist),
      formatField("Date", focalArtwork.date),
      formatField("Department", focalArtwork.department),
      formatField("Credit Line", focalArtwork.creditLine),
      formatField("Description", focalArtwork.description),
    ].filter(Boolean) : []

    return (
      <>
        <style>{`
          .focal-modal-scroll::-webkit-scrollbar {
            width: 8px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          
          .focal-modal-scroll::-webkit-scrollbar-track {
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            margin: 8px 0;
          }
          
          .focal-modal-scroll::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            transition: background-color 0.2s ease;
          }
          
          .focal-modal-scroll::-webkit-scrollbar-thumb:hover {
            background-color: rgba(255, 255, 255, 0.5);
          }
          
          .focal-modal-scroll::-webkit-scrollbar-thumb:active {
            background-color: rgba(255, 255, 255, 0.6);
          }
          
          /* For Firefox */
          .focal-modal-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
          }
          
          /* Much larger scrollbar for mobile/touch devices */
          @media (hover: none) and (pointer: coarse) {
            .focal-modal-scroll::-webkit-scrollbar {
              width: 20px;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-track {
              background-color: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(255, 255, 255, 0.5);
              border-radius: 10px;
              border: 3px solid transparent;
              background-clip: padding-box;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-thumb:active {
              background-color: rgba(255, 255, 255, 0.7);
            }
          }
          
          /* Alternative mobile detection */
          @media (max-width: 768px) {
            .focal-modal-scroll::-webkit-scrollbar {
              width: 20px;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(255, 255, 255, 0.5);
              min-height: 50px; /* Ensure thumb is always grabbable */
            }
            
            .focal-modal-scroll {
              padding-right: 8px !important; /* Less padding on mobile for wider scrollbar */
            }
          }
        `}</style>
        <div
          className="focal-modal-scroll"
          style={{
            position: 'absolute',
            left: imageX,
            top: imageY,
            cursor: 'pointer',
            transform: 'translate(-50%, -50%)',
            transformOrigin: 'center center',
            zIndex: 99999,
            backgroundColor: 'rgba(38, 37, 36, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            paddingRight: '16px', // Less padding on right to accommodate scrollbar
            minWidth: '320px',
            maxWidth: '450px',
            maxHeight: '600px',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.6), 0 10px 20px -4px rgb(0 0 0 / 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          }}
          onClick={handleClick}
          onScroll={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
        {/* Title */}
        {focalArtwork?.title ? (
          <h3 className="text-lg font-medium text-white/95 leading-tight mb-4">
            {focalArtwork.title}
          </h3>
        ) : (
          <h3 className="text-lg font-medium text-white/90 leading-tight mb-4">
            Artwork details
          </h3>
        )}
        
        {/* Fields */}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index}>
              {field}
            </div>
          ))}
        </div>

        {fields.length === 0 && !focalArtwork?.title && (
          <p className="text-white/70 text-sm italic">
            No additional information available for this artwork.
          </p>
        )}

        {/* View on The MET Button */}
        {focalArtwork?.objectUrl && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (focalArtwork?.objectUrl) {
                  window.open(focalArtwork.objectUrl, '_blank', 'noopener,noreferrer')
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View on The MET
            </button>
          </div>
        )}
        
        {/* Click to close hint */}
        <div className="mt-4 text-white/50 text-xs text-center">
          Click to close
        </div>
        </div>
      </>
    )
  }

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
          alt={image.title ?? 'Focal artwork'}
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
  isDragging = false,
  dragDistance = 0,
  focalArtwork
}: ChunkComponentProps & {
  dragDistance?: number
  focalArtwork?: {
    title: string | null
    artist: string | null
    date?: string | null
    department?: string | null
    creditLine?: string | null
    description?: string | null
    objectUrl?: string | null
  }
}) {
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


  return (
    <div
      style={{
        position: 'absolute',
        left: pixelX,
        top: pixelY,
        width: CHUNK_WIDTH,
        height: CHUNK_HEIGHT,
        // No background - let it blend with the main background
        pointerEvents: 'auto'
      }}
    >
      <FocalImage
        image={focalImage}
        position={focalPosition}
        onImageClick={onImageClick}
        isDragging={isDragging}
        dragDistance={dragDistance}
        focalArtwork={focalArtwork}
      />

    </div>
  )
})

FocalChunkComponent.displayName = 'FocalChunkComponent'

export default FocalChunkComponent