/**
 * Similarity Field Component with streaming/progressive loading
 * 
 * This component displays a field of similar artworks around a focal point,
 * using progressive loading for better performance.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import ChunkSkeleton from '../grid-legacy/grid/ChunkSkeleton'
import { useViewport } from '../grid-legacy/grid/hooks/useViewport'
import { TRACKPAD_SPEED, DEBUG_LOGGING, CHUNK_WIDTH, CHUNK_HEIGHT } from './utils/constants'
import { chunkToPixelCoords } from './utils/chunkCalculations'
import type { ImageItem } from '../grid-legacy/grid/types/grid'
import type { Artwork } from '@/types/api'
import type { TimelineRange } from '@/types/api'

// Dynamically import the chunk manager to avoid SSR issues
const SimilarityChunkManagerSimple = dynamic(
  () => import('./SimilarityChunkManagerSimple'),
  { ssr: false }
)

interface SimilarityFieldProps {
  focalArtworkId: number
  focalArtwork?: {
    id: number
    objectId?: number | null
    title: string | null
    artist: string | null
    date?: string | null
    department?: string | null
    creditLine?: string | null
    description?: string | null
    imageUrl: string | null
    originalImageUrl: string | null
    objectUrl?: string | null
  }
  onArtworkClick?: (artwork: {
    id: number
    objectId?: number | null
    title: string | null
    artist: string | null
    imageUrl: string | null
  }) => void
  className?: string
  timelineRange?: TimelineRange | null
}

const SimilarityField = memo(function SimilarityField({
  focalArtworkId,
  focalArtwork,
  onArtworkClick,
  className = '',
  timelineRange
}: SimilarityFieldProps) {
  const {
    viewport,
    viewportDimensions,
    isDragging,
    dragDistance,
    isInitialized,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClickCapture,
    translate,
    updatePosition,
    setViewportPosition
  } = useViewport(1, 1)

  const setViewportPositionRef = useRef(setViewportPosition)
  setViewportPositionRef.current = setViewportPosition

  // Fallback centering (overridden by precise centering)
  const hasInitializedCenter = useRef(false)
  const [isCentered, setIsCentered] = useState(false)
  const updatePositionRef = useRef(updatePosition)
  useEffect(() => { updatePositionRef.current = updatePosition }, [updatePosition])

  useEffect(() => {
    if (isInitialized && !hasInitializedCenter.current && containerRef.current) {
      const container = containerRef.current
      const centerX = container.clientWidth / 2
      const centerY = container.clientHeight / 2

      const chunk00Position = chunkToPixelCoords(0, 0)
      const chunkCenterX = chunk00Position.x + (CHUNK_WIDTH / 2)
      const chunkCenterY = chunk00Position.y + (CHUNK_HEIGHT / 2)

      setViewportPositionRef.current({
        x: centerX - chunkCenterX,
        y: centerY - chunkCenterY,
      })
      setIsCentered(true)
      // allow precise centering to set hasInitializedCenter
    }
  }, [containerRef, isInitialized])

  // Handle trackpad navigation
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let rafId = 0
    let pendingDeltaX = 0
    let pendingDeltaY = 0

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey) return
      e.preventDefault()
      e.stopPropagation()

      const isTrackpadGesture =
        Math.abs(e.deltaX) > 0 ||
        (Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50)

      if (isTrackpadGesture) {
        const speed = TRACKPAD_SPEED
        const deltaX = -e.deltaX * speed
        const deltaY = -e.deltaY * speed

        pendingDeltaX += deltaX
        pendingDeltaY += deltaY
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            updatePositionRef.current(pendingDeltaX, pendingDeltaY)
            pendingDeltaX = 0
            pendingDeltaY = 0
            rafId = 0
          })
        }
      }
    }

    container.addEventListener('wheel', handleWheelEvent, { passive: false })

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.classList.add('no-scroll')
    document.body.classList.add('no-scroll')
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      container.removeEventListener('wheel', handleWheelEvent)
      if (rafId) cancelAnimationFrame(rafId)
      document.documentElement.classList.remove('no-scroll')
      document.body.classList.remove('no-scroll')
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [containerRef])

  // Precise focal placement (center - matches draggable grid positioning)
  const handleFocalArtworkPosition = useCallback((position: { x: number; y: number; chunkX: number; chunkY: number }) => {
    if (!containerRef.current || hasInitializedCenter.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const centerX = width / 2
    const centerY = height / 2
    const targetX = centerX // Center focal image horizontally (same as draggable grid)
    const targetY = centerY // Center focal image vertically (same as draggable grid)

    const desiredTranslateX = targetX - position.x
    const desiredTranslateY = targetY - position.y

    if (DEBUG_LOGGING) {
      console.log('🎯 Focal placement', {
        focalWorld: position,
        viewport: { width, height },
        target: { x: targetX, y: targetY },
        desiredTranslate: { x: desiredTranslateX, y: desiredTranslateY },
      })
    }

    setViewportPositionRef.current({ x: desiredTranslateX, y: desiredTranslateY })
    hasInitializedCenter.current = true
  }, [containerRef])

  const handleImageClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (onArtworkClick && image.databaseId) {
      onArtworkClick({
        id: image.databaseId,
        objectId: image.objectId,
        title: image.title ?? null,
        artist: image.artist ?? null,
        imageUrl: image.src
      })
      if (DEBUG_LOGGING) {
        console.log(`🎯 Rabbit hole navigation: clicked artwork ${image.databaseId} - "${image.title}" by ${image.artist}`)
      }
    }
  }, [onArtworkClick])

  return (
    <div
      ref={containerRef}
      className={`similarity-field ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor: '#f5f5f5'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
    >
      <div
        className="relative"
        style={{
          transform: `translate3d(${translate.x}px, ${translate.y}px, 0)`,
          willChange: 'transform',
        }}
      >
        {isInitialized && isCentered && (
          <SimilarityChunkManagerSimple
            viewport={viewport}
            isDragging={isDragging}
            dragDistance={dragDistance}
            isInitialized={isInitialized}
            focalArtworkId={focalArtworkId}
            focalArtwork={focalArtwork}
            onImageClick={handleImageClick}
            onFocalArtworkPosition={handleFocalArtworkPosition}
            timelineRange={timelineRange}
          />
        )}
      </div>

      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.15) 70%, rgba(0, 0, 0, 0.3) 100%)`,
          zIndex: 10,
        }}
      />

      {(!isInitialized || !isCentered) && (
        <ChunkSkeleton
          chunkX={0}
          chunkY={0}
          chunkWidth={viewportDimensions.width || CHUNK_WIDTH}
          chunkHeight={viewportDimensions.height || CHUNK_HEIGHT}
        />
      )}
    </div>
  )
})

SimilarityField.displayName = 'SimilarityField'
export default SimilarityField
