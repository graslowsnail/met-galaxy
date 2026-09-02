/**
 * NavigationOverlay - Shows rabbit hole navigation history at bottom center
 * 
 * Displays clickable thumbnails representing the user's exploration path,
 * allowing them to backtrack to any previous focal image with smart history truncation.
 */

import React, { memo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Heart, Loader2, Share } from 'lucide-react'

export interface NavigationHistoryItem {
  id: number | 'main-grid'
  objectId?: number | null
  title: string | null
  artist: string | null
  thumbnailUrl: string | null
  isMainGrid?: boolean
}

interface NavigationOverlayProps {
  /** Current navigation history path */
  navigationHistory: NavigationHistoryItem[]
  /** ID of the currently active focal artwork */
  currentFocalId: number | 'main-grid'
  /** Callback when user clicks a history item */
  onNavigateToHistoryItem: (item: NavigationHistoryItem, index: number) => void
  onSharePath?: () => void
  shareStatus?: 'idle' | 'copied'
  liked?: boolean
  likeCount?: number
  isLikeLoading?: boolean
  onToggleLike?: () => void
  /** Whether the overlay should be visible */
  isVisible?: boolean
}

/**
 * Individual thumbnail component for navigation history
 */
const NavigationThumbnail = memo(function NavigationThumbnail({
  item,
  isCurrentFocal,
  onClick
}: {
  item: NavigationHistoryItem
  isCurrentFocal: boolean
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selectedBorder = '2px solid rgba(212, 161, 26, 0.72)'
  const selectedGlow = '0 0 0 3px rgba(232, 160, 32, 0.18), 0 8px 20px -10px rgba(160, 109, 22, 0.55)'

  const showPreview = () => {
    setIsHovered(true)
    if (!item.isMainGrid && item.thumbnailUrl) {
      setPreviewRect(buttonRef.current?.getBoundingClientRect() ?? null)
    }
  }

  const hidePreview = () => {
    setIsHovered(false)
    setPreviewRect(null)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        onFocus={showPreview}
        onBlur={hidePreview}
        aria-label={item.isMainGrid ? 'Return to main gallery' : `Return to ${item.title ?? 'artwork'}`}
        title={item.isMainGrid ? 'Main gallery' : item.title ?? 'Artwork'}
        style={{
          position: 'relative',
          width: '36px',
          minWidth: '36px',
          height: '36px',
          padding: 0,
          border: 0,
          borderRadius: '10px',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'opacity 160ms ease',
          opacity: isCurrentFocal || isHovered ? 1 : 0.82
        }}
      >
        {item.isMainGrid ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#efece4',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3c3931',
              fontSize: '14px',
              fontWeight: 600,
              border: isCurrentFocal ? selectedBorder : '2px solid transparent',
              boxShadow: isCurrentFocal ? selectedGlow : 'none'
            }}
          >
            ⌂
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '10px',
              overflow: 'hidden',
              border: isCurrentFocal ? selectedBorder : '2px solid transparent',
              backgroundColor: '#efece4',
              boxShadow: isCurrentFocal ? selectedGlow : 'none'
            }}
          >
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title ?? 'Artwork'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<div style="width: 100%; height: 100%; background: #efece4; display: flex; align-items: center; justify-content: center; color: #6f6b62; font-size: 8px;">No Image</div>'
                  }
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#efece4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6f6b62',
                  fontSize: '8px'
                }}
              >
                No Image
              </div>
            )}
          </div>
        )}
      </button>

      {previewRect && item.thumbnailUrl && typeof document !== 'undefined' && createPortal(
        <div
          aria-hidden="true"
          className="path-thumbnail-preview"
          style={{
            position: 'fixed',
            top: `${previewRect.bottom - 56}px`,
            left: `${previewRect.left + previewRect.width / 2}px`,
            zIndex: 1200,
            width: '56px',
            height: '56px',
            overflow: 'hidden',
            pointerEvents: 'none',
            borderRadius: '14px',
            border: isCurrentFocal ? selectedBorder : '1px solid rgba(15, 21, 36, 0.08)',
            backgroundColor: '#efece4',
            boxShadow: isCurrentFocal ? `${selectedGlow}, 0 10px 24px -10px rgba(15, 21, 36, 0.45)` : '0 10px 24px -10px rgba(15, 21, 36, 0.45)',
            transformOrigin: 'center bottom',
            animation: 'path-thumbnail-magnify 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
          }}
        >
          <img
            src={item.thumbnailUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>,
        document.body
      )}
    </>
  )
})

/**
 * Main navigation overlay component
 */
const NavigationOverlay = memo(function NavigationOverlay({
  navigationHistory,
  currentFocalId,
  onNavigateToHistoryItem,
  onSharePath,
  shareStatus = 'idle',
  liked = false,
  likeCount = 0,
  isLikeLoading = false,
  onToggleLike,
  isVisible = true
}: NavigationOverlayProps) {
  if (!isVisible || navigationHistory.length === 0) {
    return null
  }

  // Show last 10 items, but preserve full history data
  const visibleHistory = navigationHistory.slice(-10)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--timeline-path-bottom, 18px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        maxWidth: 'calc(100vw - 24px)',
        overflowX: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(14px)',
        borderRadius: '16px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 6px rgba(15, 21, 36, 0.08), 0 12px 30px -20px rgba(15, 21, 36, 0.35)',
        border: '1px solid rgba(15, 21, 36, 0.05)'
      }}
    >
      {/* Navigation breadcrumb text */}
      <div
        style={{
          fontSize: '13px',
          color: '#8d887e',
          whiteSpace: 'nowrap'
        }}
      >
        Path
      </div>
      
      {/* Thumbnail navigation items */}
      {visibleHistory.map((item, index) => {
        // Calculate the actual index in the full history
        const actualIndex = navigationHistory.length - visibleHistory.length + index
        const isCurrentFocal = item.id === currentFocalId
        
        return (
          <React.Fragment key={`${item.id}-${actualIndex}`}>
            <NavigationThumbnail
              item={item}
              isCurrentFocal={isCurrentFocal}
              onClick={() => onNavigateToHistoryItem(item, actualIndex)}
            />
            
            {/* Arrow separator between items */}
            {index < visibleHistory.length - 1 && (
              <div
                style={{
                  fontSize: '14px',
                  color: '#b3ada2',
                  margin: '0 -4px'
                }}
              >
                →
              </div>
            )}
          </React.Fragment>
        )
      })}
      
      {/* Show count if history is truncated */}
      {navigationHistory.length > 10 && (
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(0, 0, 0, 0.5)',
            marginLeft: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          +{navigationHistory.length - 10} more
        </div>
      )}

      {onSharePath && currentFocalId !== 'main-grid' && (
        <div aria-hidden="true" style={{ width: '1px', minWidth: '1px', height: '22px', backgroundColor: '#eae7e0' }} />
      )}

      {onSharePath && currentFocalId !== 'main-grid' && (
        <button
          type="button"
          onClick={onSharePath}
          aria-label="Copy path link"
          title={shareStatus === 'copied' ? 'Link copied' : 'Copy path link'}
          style={{
            minWidth: shareStatus === 'copied' ? '96px' : '36px',
            height: '36px',
            padding: shareStatus === 'copied' ? '0 8px' : '0',
            borderRadius: '8px',
            border: 0,
            backgroundColor: shareStatus === 'copied' ? 'rgba(74, 222, 128, 0.14)' : 'transparent',
            color: shareStatus === 'copied' ? '#15803d' : '#6f6b62',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          {shareStatus === 'copied' ? (
            <>
              <Check size={17} />
              <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>Link copied</span>
            </>
          ) : <Share size={18} />}
        </button>
      )}

      {onToggleLike && currentFocalId !== 'main-grid' && (
        <button
          type="button"
          onClick={onToggleLike}
          disabled={isLikeLoading}
          aria-label={liked ? 'Unlike this artwork' : 'Like this artwork'}
          title={liked ? 'Unlike this artwork' : 'Like this artwork'}
          style={{
            minWidth: '48px',
            height: '36px',
            padding: '0 4px',
            borderRadius: '8px',
            border: 0,
            backgroundColor: liked ? 'rgba(244, 63, 94, 0.1)' : 'transparent',
            color: liked ? '#e11d48' : '#b3ada2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            cursor: isLikeLoading ? 'wait' : 'pointer',
          }}
        >
          {isLikeLoading
            ? <Loader2 size={17} className="animate-spin" />
            : <Heart size={18} fill={liked ? 'currentColor' : 'none'} />}
          <span style={{ fontSize: '13px', fontWeight: 500, color: liked ? '#e11d48' : '#6f6b62' }}>{likeCount}</span>
        </button>
      )}
    </div>
  )
})

NavigationOverlay.displayName = 'NavigationOverlay'

export default NavigationOverlay
