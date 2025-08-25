/**
 * Types specific to the Similarity Grid System
 * 
 * This extends the base grid types with similarity-specific properties
 * and layouts for displaying related artworks in a grid format.
 */

// Re-export base grid types for compatibility
export type {
  Position,
  ViewportState,
  DragState,
  ViewportBounds,
  UseViewportReturn
} from '../../../grid-legacy/grid/types/grid'

/**
 * Similarity-specific image item that extends base ImageItem
 */
export interface SimilarityImageItem {
  id: string
  databaseId: number
  imageUrl: string
  title: string
  artist: string
  width: number
  height: number
  aspectRatio: number
  x: number
  y: number
  
  // Similarity-specific properties
  similarity?: number        // Similarity score (0-1)
  isOriginal?: boolean      // True if this is the focal/clicked image
  isFocal?: boolean        // True if this is currently the center focal image
  imageType: 'focal' | 'similar' | 'random'  // Type of image in the layout
  gridSize: 'large' | 'medium' | 'small'     // Size category for grid layout
}

/**
 * Similarity chunk containing mixed image types
 */
export interface SimilarityChunk {
  id: string
  x: number                  // Chunk X coordinate in grid
  y: number                  // Chunk Y coordinate in grid
  images: SimilarityImageItem[]
  isVisible: boolean
  
  // Similarity-specific properties
  chunkType: 'focal' | 'similar' | 'mixed' | 'random'  // Predominant content type
  focalImageId?: number      // If this chunk contains the focal image
  averageSimilarity?: number // Average similarity score of similar images
}

/**
 * Layout configuration for similarity grid
 */
export interface SimilarityLayoutConfig {
  // Focal image (center position)
  focalImageSize: number     // Size of the main focal image (e.g., 400px)
  focalPosition: Position    // Position of focal image (usually 0,0)
  
  // Grid layout
  baseImageSize: number      // Standard image size for similar images
  smallImageSize: number     // Size for random/filler images
  gridSpacing: number        // Space between images
  columnsPerChunk: number    // Images per row in chunks
  
  // Similarity zones
  similarityZones: {
    high: { minSimilarity: number; maxDistance: number; imageSize: number }
    medium: { minSimilarity: number; maxDistance: number; imageSize: number }
    low: { minSimilarity: number; maxDistance: number; imageSize: number }
    random: { maxDistance: number; imageSize: number }
  }
}

/**
 * Similarity data from API
 */
export interface SimilarityData {
  targetArtwork: {
    id: number
    title: string
    artist: string
    imageUrl: string
  }
  similarArtworks: Array<{
    id: number
    title: string
    artist: string
    imageUrl: string
    similarity: number
    isOriginal: boolean
  }>
  meta: {
    targetId: number
    targetTitle: string
    targetArtist: string
    count: number
    responseTime: string
  }
}

/**
 * Chunk data specific to similarity grid
 */
export interface SimilarityChunkData {
  chunkId: string
  isLoading: boolean
  error: Error | null
  chunk: SimilarityChunk | null
  lastFetch: number
  
  // Similarity-specific metadata
  containsFocalImage: boolean
  similarityRange: { min: number; max: number }
  imageTypeCounts: {
    focal: number
    similar: number
    random: number
  }
}

/**
 * Grid state for similarity exploration
 */
export interface SimilarityGridState {
  currentFocalId: number
  focalImagePosition: Position
  loadedChunks: Map<string, SimilarityChunkData>
  visibleChunks: string[]
  
  // Navigation state
  navigationHistory: number[]  // Stack of focal image IDs for back navigation
  isTransitioning: boolean     // True during focal image changes
  
  // Data loading state
  similarityData: SimilarityData | null
  randomArtworks: any[] | null
  isLoadingSimilarity: boolean
  isLoadingRandom: boolean
}

/**
 * Props for similarity grid components
 */
export interface SimilarityGridProps {
  initialArtworkId: number
  onArtworkClick?: (artwork: SimilarityImageItem) => void
  onClose?: () => void
  layoutConfig?: Partial<SimilarityLayoutConfig>
  showPerformanceOverlay?: boolean
  showLoadingIndicators?: boolean
}

/**
 * Hook return type for similarity data management
 */
export interface UseSimilarityDataReturn {
  gridState: SimilarityGridState
  setCurrentFocalId: (id: number) => void
  goBackInHistory: () => void
  refreshSimilarityData: () => void
  
  // Loading states
  isLoading: boolean
  error: Error | null
  
  // Chunk management
  loadChunk: (chunkId: string) => Promise<SimilarityChunk>
  getVisibleChunks: () => SimilarityChunk[]
}