/**
 * Similarity Field Component with streaming/progressive loading
 * 
 * This component displays a field of similar artworks around a focal point,
 * using progressive loading for better performance.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useViewport } from '../grid-legacy/grid/hooks/useViewport'
import { TRACKPAD_SPEED, DEBUG_LOGGING, CHUNK_WIDTH, CHUNK_HEIGHT } from './utils/constants'
import { chunkToPixelCoords } from '../grid-legacy/grid/utils/chunkCalculations'
import type { ImageItem } from '../grid-legacy/grid/types/grid'
import type { Artwork } from '@/types/api'

// Dynamically import the chunk manager to avoid SSR issues
const SimilarityChunkManagerSimple = dynamic(
  () => import('./SimilarityChunkManagerSimple'),
  { ssr: false }
)

interface SimilarityFieldProps {
  focalArtworkId: number
  focalArtwork?: {
    id: number
    title: string | null
    artist: string | null
    imageUrl: string | null
    originalImageUrl: string | null
  }
  onArtworkClick?: (artwork: {
    id: number
    title: string | null
    artist: string | null
    imageUrl: string | null
  }) => void
  className?: string
}

const SimilarityField = memo(function SimilarityField({
  focalArtworkId,
  focalArtwork,
  onArtworkClick,
  className = ''
}: SimilarityFieldProps) {
  const {
    viewport,
    isDragging,
    isInitialized,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    translate,
    updatePosition
  } = useViewport()

  // Keep a ref of the latest translate for delta math
  const translateRef = useRef(translate)
  useEffect(() => { translateRef.current = translate }, [translate])

  // Fallback centering (overridden by precise centering)
  const hasInitializedCenter = useRef(false)
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

      const desiredTranslateX = centerX - chunkCenterX
      const desiredTranslateY = centerY - chunkCenterY

      const dx = desiredTranslateX - translateRef.current.x
      const dy = desiredTranslateY - translateRef.current.y
      updatePositionRef.current(dx, dy)
      // allow precise centering to set hasInitializedCenter
    }
  }, [isInitialized])

  // Handle trackpad navigation
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let rafId = 0

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

        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          if (deltaX !== 0 || deltaY !== 0) updatePositionRef.current(deltaX, deltaY)
        })
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

    const curr = translateRef.current
    const dx = desiredTranslateX - curr.x
    const dy = desiredTranslateY - curr.y

    if (DEBUG_LOGGING) {
      console.log('🎯 Focal placement', {
        focalWorld: position,
        viewport: { width, height },
        target: { x: targetX, y: targetY },
        currTranslate: curr,
        desiredTranslate: { x: desiredTranslateX, y: desiredTranslateY },
        delta: { x: dx, y: dy },
      })
    }

    updatePositionRef.current(dx, dy)
    hasInitializedCenter.current = true
  }, [])

  const handleImageClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (onArtworkClick && image.databaseId) {
      onArtworkClick({
        id: image.databaseId,
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
        backgroundColor: '#f5f5f5'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'}
        style={{
          transform: `translate3d(${translate.x}px, ${translate.y}px, 0)`,
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        {isInitialized && (
          <SimilarityChunkManagerSimple
            viewport={viewport}
            isDragging={isDragging}
            isInitialized={isInitialized}
            focalArtworkId={focalArtworkId}
            focalArtwork={focalArtwork}
            onImageClick={handleImageClick}
            onFocalArtworkPosition={handleFocalArtworkPosition}
          />
        )}
      </div>

      {!isInitialized && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '18px',
            color: '#666'
          }}
        >
          Loading similarity field...
        </div>
      )}
    </div>
  )
})

SimilarityField.displayName = 'SimilarityField'
export default SimilarityField
