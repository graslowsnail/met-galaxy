/**
 * Type definitions for the DraggableImageGrid component system
 * 
 * This file contains all interfaces and types used across the grid components,
 * providing a centralized location for type definitions and ensuring consistency.
 */

import type { Artwork } from "@/types/api"

// ============================================================================
// CORE GRID TYPES
// ============================================================================

/**
 * Represents an individual image item within the grid
 * Contains both visual properties and database metadata
 */
export interface ImageItem {
  /** Unique identifier for the image within the grid */
  id: string
  /** Image source URL */
  src: string
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** Calculated aspect ratio (width/height) */
  aspectRatio: number
  /** X coordinate of the chunk this image belongs to */
  chunkX: number
  /** Y coordinate of the chunk this image belongs to */
  chunkY: number
  /** Index of this image within its chunk */
  localIndex: number
  
  // Database fields from artwork data
  /** The database ID used for similarity API calls */
  databaseId?: number
  objectId?: number
  title?: string | null
  artist?: string | null
  date?: string | null
  department?: string | null
  culture?: string | null
  medium?: string | null
  creditLine?: string | null
  description?: string | null
  objectUrl?: string | null
}

/**
 * Represents a positioned image with its calculated layout coordinates
 */
export interface PositionedImage {
  /** X coordinate in pixels */
  x: number
  /** Y coordinate in pixels */
  y: number
  /** Height in pixels (may be constrained by chunk bounds) */
  height: number
}

/**
 * Bounding box for spatial calculations
 */
export interface BoundingBox {
  /** Minimum X coordinate */
  minX: number
  /** Maximum X coordinate */
  maxX: number
  /** Minimum Y coordinate */
  minY: number
  /** Maximum Y coordinate */
  maxY: number
}

/**
 * Represents a chunk - a discrete grid cell containing multiple images
 * Each chunk is positioned in a grid layout and manages its own masonry layout internally
 */
export interface Chunk {
  /** Unique identifier for the chunk */
  id: string
  /** Grid X coordinate of the chunk */
  x: number
  /** Grid Y coordinate of the chunk */
  y: number
  /** Array of images contained in this chunk */
  images: ImageItem[]
  /** Calculated positions for each image */
  positions: PositionedImage[]
  /** Bounding box containing all images in this chunk */
  bounds: BoundingBox
  /** The actual height this chunk occupies in pixels */
  actualHeight: number
}

// ============================================================================
// DATA MANAGEMENT TYPES
// ============================================================================

/**
 * Represents the data state for a chunk
 */
export interface ChunkData {
  /** Artwork data for the chunk, null if not loaded */
  artworks: Artwork[] | null
  /** Whether data is currently being fetched */
  loading: boolean
  /** Any error that occurred during data fetching */
  error: Error | null
}

/**
 * Chunk coordinates in the grid system
 */
export interface ChunkCoordinates {
  /** X coordinate in the grid */
  x: number
  /** Y coordinate in the grid */
  y: number
}

/**
 * Parameters for chunk data fetching
 */
export interface ChunkDataParams extends ChunkCoordinates {
  /** Number of artworks to fetch for the chunk */
  count: number
}

// ============================================================================
// VIEWPORT & INTERACTION TYPES
// ============================================================================

/**
 * Current viewport state and dimensions
 */
export interface ViewportState {
  /** Viewport width in pixels */
  width: number
  /** Viewport height in pixels */
  height: number
  /** Current translation X offset */
  translateX: number
  /** Current translation Y offset */
  translateY: number
}

/**
 * Drag interaction state
 */
export interface DragState {
  /** Whether dragging is currently active */
  isDragging: boolean
  /** Starting coordinates when drag began */
  startX: number
  /** Starting coordinates when drag began */
  startY: number
  /** Distance moved from initial position */
  distance: number
}

/**
 * Touch/mouse position
 */
export interface Position {
  /** X coordinate */
  x: number
  /** Y coordinate */
  y: number
}

/**
 * Viewport bounds for visibility calculations
 */
export interface ViewportBounds {
  /** Left edge of viewport */
  left: number
  /** Right edge of viewport */
  right: number
  /** Top edge of viewport */
  top: number
  /** Bottom edge of viewport */
  bottom: number
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for individual chunk components
 */
export interface ChunkComponentProps {
  /** The chunk data to render */
  chunk: Chunk
  /** Whether the chunk is currently loading */
  isLoading?: boolean
  /** Callback when an image is clicked */
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  /** Whether dragging is currently active (to prevent clicks) */
  isDragging?: boolean
  /** Whether to show chunk boundary for debugging */
  showBoundary?: boolean
}

/**
 * Props for the chunk skeleton/loading component
 */
export interface ChunkSkeletonProps {
  /** X coordinate of the chunk being loaded */
  chunkX: number
  /** Y coordinate of the chunk being loaded */
  chunkY: number
  /** Whether to show chunk boundary for debugging */
  showBoundary?: boolean
}

/**
 * Props for the grid renderer component
 */
export interface GridRendererProps {
  /** Map of chunks to render */
  chunks: Map<string, Chunk>
  /** Current translation state */
  translate: Position
  /** Whether dragging is active */
  isDragging: boolean
  /** Callback when an image is clicked */
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  /** Set of chunk keys that are currently loading */
  loadingChunks?: Set<string>
  /** Number of visible chunks for debug display */
  visibleChunks?: number
  /** Chunk data map for performance display */
  chunkDataMap?: Map<string, ChunkData>
  /** Whether to show performance overlay */
  showPerformanceOverlay?: boolean
  /** Whether to show axis lines */
  showAxisLines?: boolean
  /** Whether to show loading indicators */
  showLoadingIndicators?: boolean
}

/**
 * Props for the main infinite artwork grid component
 */
export interface InfiniteArtworkGridProps {
  /** Callback when an artwork is selected for similarity view */
  onArtworkSelect?: (artworkId: number) => void
  /** Optional initial viewport position */
  initialPosition?: Position
  /** Whether to show debug information */
  showDebugInfo?: boolean
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useChunkData hook
 */
export interface UseChunkDataReturn {
  /** Map of chunk keys to their data state */
  chunkDataMap: Map<string, ChunkData>
  /** Function to fetch data for specific chunk coordinates */
  fetchChunkData: (chunkX: number, chunkY: number) => Promise<Artwork[] | null>
  /** Whether any chunks are currently loading */
  isLoading: boolean
  /** Function to clear data cache (for memory management) */
  clearCache: () => void
  /** Function to fetch multiple chunks in parallel (legacy - waits for all) */
  fetchMultipleChunks: (coordinates: ChunkCoordinates[], priority?: 'high' | 'low') => Promise<void>
  /** Function to fetch a single chunk with streaming approach */
  fetchChunkStreaming: (chunkX: number, chunkY: number, priority?: 'high' | 'low') => Promise<void>
  /** Function to fetch chunks with intelligent prioritization */
  fetchChunksWithPriority: (visibleChunks: ChunkCoordinates[], bufferChunks?: ChunkCoordinates[]) => Promise<void>
  /** Function to get data for a specific chunk (synchronous cache access) */
  getChunkData: (chunkX: number, chunkY: number) => ChunkData | undefined
  /** Function to check if a chunk has loaded artwork data */
  hasChunkData: (chunkX: number, chunkY: number) => boolean
  /** Function to check if a chunk is currently loading */
  isChunkLoading: (chunkX: number, chunkY: number) => boolean
  /** Function to get cache statistics for monitoring */
  getCacheStats: () => {
    totalEntries: number
    loadedEntries: number
    loadingEntries: number
    errorEntries: number
    fetchingEntries: number
  }
}

/**
 * Return type for useViewport hook
 */
export interface UseViewportReturn {
  /** Current viewport state */
  viewport: ViewportState
  /** Current translation position */
  translate: Position
  /** Viewport dimensions */
  viewportDimensions: { width: number; height: number }
  /** Whether viewport is initialized */
  isInitialized: boolean
  /** Current drag state */
  dragState: DragState
  /** Whether dragging is currently active */
  isDragging: boolean
  /** Distance moved during current drag operation */
  dragDistance: number
  /** Function to handle mouse down events */
  handleMouseDown: (event: React.MouseEvent) => void
  /** Function to handle touch start events */
  handleTouchStart: (event: React.TouchEvent) => void
  /** Function to get viewport bounds */
  getViewportBounds: (includeBuffer?: boolean) => ViewportBounds
  /** Function to check if viewport has changed significantly */
  hasSignificantViewportChange: (threshold?: number) => boolean
  /** Function to register post-drag callbacks */
  onPostDrag: (callback: () => void) => () => void
  /** Function to set viewport position programmatically */
  setViewportPosition: (position: Position) => void
  /** Function to reset viewport to center */
  resetViewport: () => void
  /** Function to update position by delta amount (for trackpad/wheel) */
  updatePosition: (deltaX: number, deltaY: number) => void
  /** Current movement velocity in pixels per second */
  velocity: Position
  /** Movement prediction data for preemptive chunk loading */
  movementPrediction: {
    direction: Position
    speed: number
    predictedChunks: Array<{ x: number; y: number; priority: number }>
  }
  /** Container ref for dimension tracking */
  containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Return type for useVirtualization hook
 */
export interface UseVirtualizationReturn {
  /** Currently visible chunk coordinates */
  visibleChunks: ChunkCoordinates[]
  /** Chunk coordinates that should be loaded (including buffer) */
  chunksToLoad: ChunkCoordinates[]
  /** Function to trigger virtualization update */
  updateVirtualization: () => void
  /** Function to force immediate virtualization update */
  forceUpdate: () => void
  /** Function to cleanup distant chunks */
  cleanup: () => void
  /** Function to check if a specific chunk is visible */
  isChunkVisible: (chunkX: number, chunkY: number) => boolean
  /** Function to check if a specific chunk should be loaded */
  shouldLoadChunk: (chunkX: number, chunkY: number) => boolean
  /** Function to get viewport bounds */
  getViewportBounds: (includeBuffer?: boolean) => ViewportBounds
  /** Function to get virtualization statistics */
  getVirtualizationStats: () => {
    visibleChunks: number
    chunksToLoad: number
    renderedChunks: number
    maxRenderedChunks: number
    needsCleanup: boolean
    isActive: boolean
  }
  /** Function to register cleanup callbacks */
  onCleanup: (callback: () => void) => () => void
  /** Function to check if chunk cleanup is needed */
  needsChunkCleanup: () => boolean
  /** Function to get chunks that should be removed */
  getChunksToRemove: (maxToKeep: number) => string[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================




