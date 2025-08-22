/**
 * Constants for Similarity Grid System
 * 
 * These constants define the grid-based layout structure similar to the main
 * draggable grid but optimized for similarity exploration with focal images.
 */

// ============================================================================
// GRID LAYOUT CONFIGURATION
// ============================================================================

/** Grid origin coordinates (matching main grid) */
export const GRID_ORIGIN_X = 0
export const GRID_ORIGIN_Y = 0

/** Standard column width for grid layout */
export const COLUMN_WIDTH = 280

/** Images per chunk (matching main grid for consistency) */
export const CHUNK_SIZE = 20

/** Columns per chunk for grid layout */
export const COLUMNS_PER_CHUNK = 4

/** Calculated total chunk width */
export const CHUNK_WIDTH = COLUMN_WIDTH * COLUMNS_PER_CHUNK + 64 // 1184px (with spacing)

/** Standard chunk height */
export const CHUNK_HEIGHT = 1600

// ============================================================================
// FOCAL IMAGE CONFIGURATION
// ============================================================================

/** Size of the main focal image at center (0,0) */
export const FOCAL_IMAGE_SIZE = 400

/** Grid position where focal image is placed (chunk coordinates) */
export const FOCAL_CHUNK_X = 0
export const FOCAL_CHUNK_Y = 0

/** Position within focal chunk where focal image is centered */
export const FOCAL_IMAGE_OFFSET_X = (CHUNK_WIDTH - FOCAL_IMAGE_SIZE) / 2
export const FOCAL_IMAGE_OFFSET_Y = (CHUNK_HEIGHT - FOCAL_IMAGE_SIZE) / 2

// ============================================================================
// IMAGE SIZE TIERS (Grid-based layout)
// ============================================================================

/** Large images (high similarity, close to focal) */
export const LARGE_IMAGE_SIZE = 240

/** Medium images (moderate similarity) */
export const MEDIUM_IMAGE_SIZE = 180

/** Small images (low similarity, random images) */
export const SMALL_IMAGE_SIZE = 120

/** Minimum image size */
export const MIN_IMAGE_SIZE = 100

// ============================================================================
// SIMILARITY ZONES (Distance from focal image)
// ============================================================================

/** Zone definitions for placing similar images */
export const SIMILARITY_ZONES = {
  // Ring 1: Immediately around focal image (8 chunks)
  HIGH_SIMILARITY: {
    minSimilarity: 0.0,      // Accept all 160 similar images
    chunkDistance: 1,        // 1 chunk away from focal
    imageSize: LARGE_IMAGE_SIZE,
    maxImages: 160          // 8 chunks * 20 images = 160 similar images
  },
  
  // Ring 2: Second ring of chunks (16 chunks)
  MEDIUM_SIMILARITY: {
    minSimilarity: 0.0,      // Accept remaining similar images if any
    chunkDistance: 2,        // 2 chunks away from focal
    imageSize: MEDIUM_IMAGE_SIZE,
    maxImages: 0            // Mostly random images via API calls
  },
  
  // Ring 3: Third ring of chunks (24 chunks) 
  LOW_SIMILARITY: {
    minSimilarity: 0.0,      // Accept any remaining images
    chunkDistance: 3,        // 3 chunks away from focal
    imageSize: SMALL_IMAGE_SIZE,
    maxImages: 0            // Pure random images via API calls
  },
  
  // Outer rings - random images mixed in
  RANDOM_ZONE: {
    chunkDistance: 4,        // 4+ chunks away from focal
    imageSize: SMALL_IMAGE_SIZE,
    randomMixRatio: 0.7     // 70% random, 30% low-similarity
  }
} as const

// ============================================================================
// CHUNK ARRANGEMENT AROUND FOCAL
// ============================================================================

/** 
 * Chunk positions relative to focal chunk (0,0)
 * Arranged in expanding rings around the focal image
 */
export const CHUNK_POSITIONS = {
  // Ring 1: Immediately adjacent to focal chunk
  RING_1: [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 },  /* FOCAL */     { x: 1, y: 0 },
    { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
  ],
  
  // Ring 2: Second ring around focal
  RING_2: [
    { x: -2, y: -2 }, { x: -1, y: -2 }, { x: 0, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -2 },
    { x: -2, y: -1 },                                                       { x: 2, y: -1 },
    { x: -2, y: 0 },                                                        { x: 2, y: 0 },
    { x: -2, y: 1 },                                                        { x: 2, y: 1 },
    { x: -2, y: 2 },  { x: -1, y: 2 },  { x: 0, y: 2 },  { x: 1, y: 2 },  { x: 2, y: 2 }
  ],
  
  // Ring 3: Third ring
  RING_3: [
    // Top row
    { x: -3, y: -3 }, { x: -2, y: -3 }, { x: -1, y: -3 }, { x: 0, y: -3 }, 
    { x: 1, y: -3 },  { x: 2, y: -3 },  { x: 3, y: -3 },
    // Sides
    { x: -3, y: -2 }, { x: 3, y: -2 },
    { x: -3, y: -1 }, { x: 3, y: -1 },
    { x: -3, y: 0 },  { x: 3, y: 0 },
    { x: -3, y: 1 },  { x: 3, y: 1 },
    { x: -3, y: 2 },  { x: 3, y: 2 },
    // Bottom row
    { x: -3, y: 3 },  { x: -2, y: 3 },  { x: -1, y: 3 },  { x: 0, y: 3 },
    { x: 1, y: 3 },   { x: 2, y: 3 },   { x: 3, y: 3 }
  ]
} as const

// ============================================================================
// PERFORMANCE SETTINGS
// ============================================================================

/** Maximum chunks rendered simultaneously */
export const MAX_RENDERED_CHUNKS = 16

/** Maximum chunk data kept in cache */
export const MAX_DATA_CACHE = 150

/** Buffer for determining visible chunks */
export const VIEWPORT_BUFFER = 200

/** Threshold for significant viewport changes */
export const VIEWPORT_CHANGE_THRESHOLD = 50

// ============================================================================
// VISUAL STYLING
// ============================================================================

/** Grid background color */
export const GRID_BACKGROUND_COLOR = '#EDE9E5'

/** Image border radius */
export const IMAGE_BORDER_RADIUS = 8

/** Focal image highlight ring */
export const FOCAL_IMAGE_RING_WIDTH = 4
export const FOCAL_IMAGE_RING_COLOR = '#3B82F6'

/** Hover effects */
export const HOVER_SCALE = 1.05
export const HOVER_TRANSITION = '0.2s ease-in-out'

/** Spacing between images within chunks */
export const IMAGE_SPACING = 12

/** Padding within chunks */
export const CHUNK_PADDING = 16

// ============================================================================
// ANIMATION & TRANSITIONS
// ============================================================================

/** Duration for focal image transition */
export const FOCAL_TRANSITION_DURATION = 500

/** Duration for chunk loading animations */
export const CHUNK_LOAD_ANIMATION_DURATION = 300

/** Delay after drag ends before updating chunks */
export const POST_DRAG_UPDATE_DELAY = 100

// ============================================================================
// DEBUG SETTINGS
// ============================================================================

/** Enable debug logging */
export const DEBUG_LOGGING = false // Cleaned up console logs

/** Show chunk boundaries in debug mode */
export const SHOW_CHUNK_BOUNDARIES = false

/** Show similarity scores on images */
export const SHOW_SIMILARITY_SCORES = true