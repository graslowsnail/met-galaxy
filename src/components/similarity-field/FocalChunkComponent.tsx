/**
 * FocalChunkComponent - Renders the focal chunk with a single prominent image
 * 
 * This component renders the focal chunk (0,0) differently from regular chunks.
 * Instead of showing 20 duplicated images, it displays a single, prominently
 * styled focal image at the center of the chunk area.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import ArtworkImage from '../grid-legacy/grid/ArtworkImage'
import { X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { Artwork } from '@/types/api'
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
    id: number
    objectId?: number | null
    title: string | null
    artist: string | null
    date?: string | null
    department?: string | null
    accessionNumber?: string | null
    creditLine?: string | null
    description?: string | null
    objectUrl?: string | null
  }
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDesktopInfo, setShowDesktopInfo] = useState(false)
  const [enrichedArtwork, setEnrichedArtwork] = useState<Artwork | null>(null)
  const completedMetadataId = useRef<number | null>(null)

  useEffect(() => {
    if (
      (!showModal && !showDesktopInfo)
      || !focalArtwork?.id
      || completedMetadataId.current === focalArtwork.id
    ) return

    const controller = new AbortController()
    const artworkId = focalArtwork.id
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    const loadMetadata = async () => {
      try {
        attempts += 1
        const { data, meta } = await apiClient.getArtwork(artworkId, controller.signal)
        if (controller.signal.aborted) return
        setEnrichedArtwork(data)
        if (!meta || meta.metadataStatus === 'complete') {
          completedMetadataId.current = artworkId
        } else {
          const delay = Math.max(meta.retryAfterMs ?? 1000, 500)
          if (attempts < 8 && delay <= 10000) timer = setTimeout(() => { void loadMetadata() }, delay)
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted && DEBUG_LOGGING) {
          console.error('Failed to load enriched artwork metadata', error)
        }
      }
    }
    void loadMetadata()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [focalArtwork?.id, showDesktopInfo, showModal])

  const displayedArtwork = enrichedArtwork?.id === focalArtwork?.id
    ? enrichedArtwork
    : focalArtwork

  // Check if we're on desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640 // sm breakpoint

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    // Prevent click during dragging OR if mouse moved significantly
    if (!isDragging && (dragDistance ?? 0) <= CLICK_MOVE_THRESHOLD) {
      if (isDesktop) {
        // On desktop, toggle side info panel
        setShowDesktopInfo(prev => !prev)
      } else {
        // On mobile, toggle modal that replaces image
        setShowModal(prev => !prev)
      }
    }
  }

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    setHasError(false)
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoaded(false)
    if (DEBUG_LOGGING) {
      console.error(`❌ Focal image failed to load: ${image.src}`)
    }
  }, [image.src])

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
        <span className="text-gray-500 text-sm">{label}:</span>
        <span className="text-gray-700 text-sm ml-2">{value}</span>
      </div>
    )
  }

  return (
    <>
      {/* Focal Image */}
      <div
        style={{
          position: 'absolute',
          left: imageX,
          top: imageY,
          cursor: isDragging ? 'grabbing' : 'pointer',
          transition: isDragging ? 'none' : 'all 0.2s ease-out',
          transform: `translate(-50%, -50%) scale(${FOCAL_IMAGE_SCALE}) ${isHovered && !isDragging ? 'scale(1.02)' : ''}`,
          transformOrigin: 'center center',
          zIndex: 10,
          borderRadius: FOCAL_IMAGE_BORDER_RADIUS,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <ArtworkImage
          src={image.src}
          alt={image.title ?? 'Focal artwork'}
          width={image.width}
          height={image.height}
          loading="eager"
          className="block"
          style={{
            borderRadius: FOCAL_IMAGE_BORDER_RADIUS,
            boxShadow: isHovered && !isDragging
              ? '0 20px 40px -10px rgb(0 0 0 / 0.25), 0 8px 20px -4px rgb(0 0 0 / 0.15)'
              : FOCAL_IMAGE_SHADOW,
            transition: isDragging ? 'none' : 'all 0.2s ease-out',
          }}
          onLoad={handleLoad}
          onError={handleError}
        />

      {/* Click Indicator */}
      {isLoaded && !hasError && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            color: '#374151',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease-out',
            opacity: isHovered ? 1 : 0.9,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            pointerEvents: 'none',
            zIndex: 20
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"/>
            <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          View Info
        </div>
      )}
      </div>

      {/* Mobile Modal - Overlays on top of image */}
      {showModal && !isDesktop && (() => {
        const fields = displayedArtwork ? [
          formatField("Artist", displayedArtwork.artist),
          formatField("Date", displayedArtwork.date),
          formatField("Department", displayedArtwork.department),
          formatField("Accession ID", displayedArtwork.accessionNumber),
          formatField("Credit Line", displayedArtwork.creditLine),
          formatField("Description", displayedArtwork.description),
        ].filter(Boolean) : []

        return (
        <>
          <style>{`
          .focal-modal-scroll::-webkit-scrollbar {
            width: 8px;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
          }
          
          .focal-modal-scroll::-webkit-scrollbar-track {
            background-color: rgba(0, 0, 0, 0.02);
            border-radius: 4px;
            margin: 8px 0;
          }
          
          .focal-modal-scroll::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            transition: background-color 0.2s ease;
          }
          
          .focal-modal-scroll::-webkit-scrollbar-thumb:hover {
            background-color: rgba(0, 0, 0, 0.3);
          }
          
          .focal-modal-scroll::-webkit-scrollbar-thumb:active {
            background-color: rgba(0, 0, 0, 0.4);
          }
          
          /* For Firefox */
          .focal-modal-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
          }
          
          /* Much larger scrollbar for mobile/touch devices */
          @media (hover: none) and (pointer: coarse) {
            .focal-modal-scroll::-webkit-scrollbar {
              width: 20px;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-track {
              background-color: rgba(0, 0, 0, 0.05);
              border-radius: 10px;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(0, 0, 0, 0.3);
              border-radius: 10px;
              border: 3px solid transparent;
              background-clip: padding-box;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-thumb:active {
              background-color: rgba(0, 0, 0, 0.5);
            }
          }
          
          /* Alternative mobile detection */
          @media (max-width: 768px) {
            .focal-modal-scroll::-webkit-scrollbar {
              width: 20px;
            }
            
            .focal-modal-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(0, 0, 0, 0.3);
              min-height: 50px; /* Ensure thumb is always grabbable */
            }
            
            .focal-modal-scroll {
              padding-right: 8px !important; /* Less padding on mobile for wider scrollbar */
            }
          }
        `}</style>
        <div
          className="focal-modal-scroll select-text"
          style={{
            position: 'absolute',
            left: imageX,
            top: imageY,
            transform: 'translate(-50%, -50%)',
            transformOrigin: 'center center',
            zIndex: 99999,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '32px',
            paddingRight: '24px',
            minWidth: '320px',
            maxWidth: '450px',
            maxHeight: '600px',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxShadow: '0 25px 50px rgb(0 0 0 / 0.5), 0 10px 20px rgb(0 0 0 / 0.3)',
            border: '1px solid rgba(229, 231, 235, 1)',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
        {/* Close Button */}
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Title */}
        {displayedArtwork?.title ? (
          <h3 className="text-lg font-medium text-gray-800 leading-tight mb-4">
            {displayedArtwork.title}
          </h3>
        ) : (
          <h3 className="text-lg font-medium text-gray-800 leading-tight mb-4">
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

        {fields.length === 0 && !displayedArtwork?.title && (
          <p className="text-gray-500 text-sm italic">
            No additional information available for this artwork.
          </p>
        )}

        {/* View on The Met Link */}
        {displayedArtwork?.objectUrl && (
          <div className="mt-3 pt-3 text-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (displayedArtwork?.objectUrl) {
                  window.open(displayedArtwork.objectUrl, '_blank', 'noopener,noreferrer')
                }
              }}
              className="text-gray-500 hover:text-gray-700 text-xs transition-colors duration-200 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View on The Met
            </button>
          </div>
        )}
        </div>
      </>
        )
      })()}


      {/* Desktop Info Panel - Shows alongside image */}
      {showDesktopInfo && isDesktop && (
        <>
          <style>{`
            .desktop-info-scroll::-webkit-scrollbar {
              width: 8px;
              background-color: transparent;
            }
            
            .desktop-info-scroll::-webkit-scrollbar-track {
              background-color: transparent;
            }
            
            .desktop-info-scroll::-webkit-scrollbar-thumb {
              background-color: rgba(0, 0, 0, 0.2);
              border-radius: 4px;
              transition: background-color 0.2s ease;
            }
            
            .desktop-info-scroll::-webkit-scrollbar-thumb:hover {
              background-color: rgba(0, 0, 0, 0.3);
            }
            
            .desktop-info-scroll::-webkit-scrollbar-thumb:active {
              background-color: rgba(0, 0, 0, 0.4);
            }
            
            /* For Firefox */
            .desktop-info-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
            }
          `}</style>
          <div
            className="desktop-info-scroll select-text absolute bg-white/85 backdrop-blur-sm rounded-2xl p-8 shadow-xl shadow-black/25 animate-in fade-in-0 slide-in-from-left-5 duration-300 border border-gray-200"
            style={{
              left: `${CHUNK_WIDTH + 20}px`, // Position to the right of focal chunk
              top: '50%',
              transform: 'translateY(-50%)',
              width: '400px',
              maxHeight: '600px',
              overflowY: 'auto',
              zIndex: 1000,
              paddingRight: '24px', // Extra padding for scrollbar
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Close Button */}
          <button
            onClick={() => setShowDesktopInfo(false)}
            className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Title with border */}
          <div className="mb-6 border-b border-gray-200 pb-4">
            {displayedArtwork?.title && (
              <h3 className="text-gray-800 font-serif font-bold text-2xl lg:text-3xl leading-tight pr-8">
                {displayedArtwork.title}
              </h3>
            )}
          </div>

          {/* Content */}
          <div className="text-gray-700 space-y-6">
            {/* Artwork Details */}
            <div className="space-y-3">
              {displayedArtwork?.artist && (
                <div>
                  <span className="text-gray-700 text-base font-medium">Artist</span>
                  <p className="text-gray-700 text-lg">{displayedArtwork.artist}</p>
                </div>
              )}
              {displayedArtwork?.date && (
                <div>
                  <span className="text-gray-500 text-sm">Date:</span>
                  <span className="text-gray-700 text-sm ml-2">{displayedArtwork.date}</span>
                </div>
              )}
              {displayedArtwork?.department && (
                <div>
                  <span className="text-gray-500 text-sm">Department:</span>
                  <span className="text-gray-700 text-sm ml-2">{displayedArtwork.department}</span>
                </div>
              )}
              {displayedArtwork?.accessionNumber && (
                <div>
                  <span className="text-gray-500 text-sm">Accession ID:</span>
                  <span className="text-gray-700 text-sm ml-2">{displayedArtwork.accessionNumber}</span>
                </div>
              )}
              {displayedArtwork?.creditLine && (
                <div>
                  <span className="text-gray-500 text-sm">Credit Line:</span>
                  <span className="text-gray-700 text-sm ml-2">{displayedArtwork.creditLine}</span>
                </div>
              )}
              {displayedArtwork?.description && (
                <div>
                  <span className="text-gray-500 text-sm">Description:</span>
                  <p className="text-gray-700 text-sm mt-1">{displayedArtwork.description}</p>
                </div>
              )}
            </div>

            {/* View on MET link */}
            {displayedArtwork?.objectUrl && (
              <div className="pt-3 text-center">
                <button
                  onClick={() => {
                    if (displayedArtwork.objectUrl) {
                      window.open(displayedArtwork.objectUrl, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xs transition-colors duration-200 flex items-center gap-1.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  View on The Met
                </button>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </>
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
    id: number
    objectId?: number | null
    title: string | null
    artist: string | null
    date?: string | null
    department?: string | null
    accessionNumber?: string | null
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
