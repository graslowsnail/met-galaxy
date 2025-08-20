/**
 * Type definitions for the Column Carry-Over Grid system
 * 
 * Based on the Infinite-Plane Masonry Grid specification.
 */

// ============================================================================
// CORE DATA TYPES
// ============================================================================

/** Image item with positioning and metadata */
export interface ImageItem {
  id: string
  src: string
  width?: number
  height?: number
  aspectRatio?: number // preferred for stable layout
  databaseId?: number
  objectId?: number
  title?: string
  artist?: string
  chunkX: number // chunk grid coordinates
  chunkY: number
  localIndex: number // index within chunk
}

/** Image positioned in world coordinates */
export interface PositionedImage {
  image: ImageItem
  worldX: number
  worldY: number
  width: number
  height: number
}

// ============================================================================
// CAMERA AND VIEWPORT TYPES
// ============================================================================

/** Camera/viewport translation state */
export interface CameraState {
  translate: { x: number; y: number }
  isDragging: boolean
}

/** Viewport dimensions */
export interface ViewportSize {
  width: number
  height: number
}

/** Viewport bounds in world coordinates */
export interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// ============================================================================
// CHUNK AND VIRTUALIZATION TYPES
// ============================================================================

/** Chunk coordinates */
export interface ChunkCoordinates {
  x: number
  y: number
}

/** Chunk data from API */
export interface ChunkData {
  id: string
  x: number
  y: number
  images: ImageItem[]
}

/** LRU cache entry */
export interface CacheEntry<T> {
  value: T
  timestamp: number
}

// ============================================================================
// COLUMN CARRY-OVER TYPES
// ============================================================================

/** Column heights for a strip */
export type ColumnHeights = [number, number, number, number]

/** Chunk key (x:y format) */
export type ChunkKey = string

/** Strip state for column carry-over */
export interface StripState {
  x: number // strip X coordinate
  columnBottoms: ColumnHeights
  chunkKeys: Set<ChunkKey> // chunks that belong to this strip
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/** usePointerPan hook return type */
export interface UsePointerPanReturn {
  translate: { x: number; y: number }
  isDragging: boolean
  dragDistance: number
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: () => void
  resetPosition: () => void
  updatePosition: (deltaX: number, deltaY: number) => void
}

/** useViewportSize hook return type */
export interface UseViewportSizeReturn {
  size: ViewportSize
  containerRef: React.RefObject<HTMLDivElement>
  isInitialized: boolean
}

/** useGridVirtualizer hook return type */
export interface UseGridVirtualizerReturn {
  visible: ChunkCoordinates[]
  isInViewport: (x: number, y: number) => boolean
  getViewportBounds: () => ViewportBounds
}

/** useChunkLoader hook return type */
export interface UseChunkLoaderReturn {
  chunks: Map<ChunkKey, ChunkData>
  isLoading: (key: ChunkKey) => boolean
  loadChunk: (x: number, y: number) => Promise<ChunkData | null>
  getCacheStats: () => { size: number; hits: number; misses: number }
  clearCache: () => void
}

/** useColumnCarryover hook return type */
export interface UseColumnCarryoverReturn {
  upsertChunk: (x: number, y: number, images: ImageItem[]) => PositionedImage[]
  getPlaced: (x: number, y: number) => PositionedImage[] | undefined
  reflowStrip: (x: number) => void
  pruneTo: (keepKeys: Set<ChunkKey>) => void
  snapshotPlaced: () => PositionedImage[]
  getStats: () => {
    totalTiles: number
    strips: number
    chunks: number
  }
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/** Props for DraggableImageGrid */
export interface DraggableImageGridProps {
  onArtworkClick?: (img: ImageItem) => void
  initialTranslate?: { x: number; y: number }
  showPerformanceOverlay?: boolean
  showLoadingIndicators?: boolean
}

/** Props for WorldPlane component */
export interface WorldPlaneProps {
  tiles: PositionedImage[]
  translate: { x: number; y: number }
  onTileClick?: (image: ImageItem, event: React.MouseEvent) => void
  isDragging: boolean
}

/** Props for PerformanceOverlay component */
export interface PerformanceOverlayProps {
  visible: boolean
  stats: {
    visibleChunks: number
    totalTiles: number
    cacheSize: number
    strips: number
    position: { x: number; y: number }
  }
  translate: { x: number; y: number }
}

/** Props for LoadingIndicator component */
export interface LoadingIndicatorProps {
  chunkX: number
  chunkY: number
  isVisible: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Generic position type */
export interface Position {
  x: number
  y: number
}

/** Generic size type */
export interface Size {
  width: number
  height: number
}

/** Generic bounds type */
export interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

// ============================================================================
// API INTEGRATION TYPES
// ============================================================================

/** API response for chunk data (matches existing API) */
export interface ChunkApiResponse {
  artworks: Array<{
    id: number
    objectId?: number
    title?: string
    artist?: string
    primaryImage?: string
    primaryImageSmall?: string
    date?: string
    department?: string
    culture?: string
    medium?: string
  }>
}

/** Error types for API failures */
export interface ApiError {
  message: string
  status?: number
  code?: string
}
