/**
 * NavigationOverlay - Shows rabbit hole navigation history at bottom center
 * 
 * Displays clickable thumbnails representing the user's exploration path,
 * allowing them to backtrack to any previous focal image with smart history truncation.
 */

import React, { memo } from 'react'
import { Check, Heart, Loader2, Share2 } from 'lucide-react'

export interface NavigationHistoryItem {
  id: number | 'main-grid'
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
  index,
  isCurrentFocal,
  onClick
}: {
  item: NavigationHistoryItem
  index: number
  isCurrentFocal: boolean
  onClick: () => void
}) {
  const thumbnailSize = isCurrentFocal ? 70 : 60
  
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: thumbnailSize,
        height: thumbnailSize,
        cursor: 'pointer',
        transition: 'all 0.2s ease-out',
        opacity: isCurrentFocal ? 1 : 0.8
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = isCurrentFocal ? '1' : '0.8'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {item.isMainGrid ? (
        // Special icon for "Back to Main Grid"
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold',
            border: isCurrentFocal ? '2px solid #4ade80' : '2px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          ⌂
        </div>
      ) : (
        // Artwork thumbnail
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: isCurrentFocal ? '2px solid #4ade80' : '2px solid rgba(255, 255, 255, 0.3)',
            backgroundColor: '#f5f5f5'
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
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div style="width: 100%; height: 100%; background: #ddd; display: flex; align-items: center; justify-content: center; color: #666; font-size: 12px;">No Image</div>'
                }
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '12px'
              }}
            >
              No Image
            </div>
          )}
        </div>
      )}
      
    </div>
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
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(245, 245, 245, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      {/* Navigation breadcrumb text */}
      <div
        style={{
          fontSize: '12px',
          color: 'rgba(0, 0, 0, 0.6)',
          marginRight: '8px',
          whiteSpace: 'nowrap'
        }}
      >
        Path:
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
              index={actualIndex}
              isCurrentFocal={isCurrentFocal}
              onClick={() => onNavigateToHistoryItem(item, actualIndex)}
            />
            
            {/* Arrow separator between items */}
            {index < visibleHistory.length - 1 && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(0, 0, 0, 0.4)',
                  margin: '0 -2px'
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
            fontSize: '10px',
            color: 'rgba(0, 0, 0, 0.5)',
            marginLeft: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          +{navigationHistory.length - 10} more
        </div>
      )}

      {onSharePath && currentFocalId !== 'main-grid' && (
        <button
          type="button"
          onClick={onSharePath}
          aria-label="Copy path link"
          title={shareStatus === 'copied' ? 'Link copied' : 'Copy path link'}
          style={{
            minWidth: '40px',
            height: '40px',
            padding: shareStatus === 'copied' ? '0 12px' : '0',
            marginLeft: '4px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            backgroundColor: shareStatus === 'copied' ? 'rgba(74, 222, 128, 0.18)' : 'rgba(255, 255, 255, 0.75)',
            color: shareStatus === 'copied' ? '#15803d' : '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          {shareStatus === 'copied' ? (
            <>
              <Check size={18} />
              <span style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>Link copied</span>
            </>
          ) : <Share2 size={18} />}
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
            height: '40px',
            padding: '0 10px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            backgroundColor: liked ? 'rgba(244, 63, 94, 0.14)' : 'rgba(255, 255, 255, 0.75)',
            color: liked ? '#e11d48' : '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            cursor: isLikeLoading ? 'wait' : 'pointer',
          }}
        >
          {isLikeLoading
            ? <Loader2 size={18} className="animate-spin" />
            : <Heart size={18} fill={liked ? 'currentColor' : 'none'} />}
          <span style={{ fontSize: '12px', fontWeight: 600 }}>{likeCount}</span>
        </button>
      )}
    </div>
  )
})

NavigationOverlay.displayName = 'NavigationOverlay'

export default NavigationOverlay
