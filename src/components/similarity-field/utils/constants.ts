/**
 * Constants for the SimilarityField component system
 * 
 * This file contains all configuration constants used across the similarity field components.
 * These are separate from the draggable grid constants to allow independent customization.
 */

// ============================================================================
// GRID LAYOUT CONSTANTS
// ============================================================================

/** Width of each column in pixels - drives the effective "zoom" of the field */
export const COLUMN_WIDTH = 160

/** Gap between items in pixels - smaller gap for compact layout */
export const GAP = 12

/** Number of columns per chunk */
export const COLUMNS_PER_CHUNK = 3

/** Number of rows per chunk (approximate for masonry layout) */
export const ROWS_PER_CHUNK = 3

/** Number of images per chunk */
export const CHUNK_SIZE = COLUMNS_PER_CHUNK * ROWS_PER_CHUNK

/** Number of images in the focal chunk (should be 1 for single focal image) */
export const FOCAL_CHUNK_SIZE = 1

/** Space around the axis lines in pixels */
export const AXIS_MARGIN = 5

/** Minimum image height in pixels to prevent very short images */
export const MIN_IMAGE_HEIGHT = Math.round(COLUMN_WIDTH * 0.5)

/** Width includes margins - total width of each chunk */
export const CHUNK_WIDTH = COLUMNS_PER_CHUNK * (COLUMN_WIDTH + GAP) + (2 * AXIS_MARGIN)

/**
 * Mean of the aspect ratio table in generateAspectRatio (grid-legacy chunkCalculations).
 * Used to size chunks so a full chunk of images roughly fills its height without the
 * masonry gap-fill pass having to stretch images.
 */
const AVG_ASPECT_RATIO = 1.15

/** Height includes margins - derived so masonry columns naturally fill the chunk */
export const CHUNK_HEIGHT = Math.round(
  ROWS_PER_CHUNK * (COLUMN_WIDTH * AVG_ASPECT_RATIO + GAP) + (2 * AXIS_MARGIN)
)

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

/** Buffer around viewport for smooth scrolling experience */
export const VIEWPORT_BUFFER = 400

/** Maximum chunks to render simultaneously (keep this small for performance!) */
export const MAX_RENDERED_CHUNKS = 40

/** Maximum chunk data to cache (can be larger than rendered chunks) */
export const MAX_DATA_CACHE = 200

// ============================================================================
// ANIMATION & INTERACTION CONSTANTS
// ============================================================================

/** Trackpad scroll sensitivity multiplier */
export const TRACKPAD_SPEED = 1.0

/** Transition duration for smooth animations in milliseconds */
export const TRANSITION_DURATION = 200

// ============================================================================
// DEBUGGING CONSTANTS
// ============================================================================

/** Whether to enable verbose console logging */
export const DEBUG_LOGGING = false 

/** Whether to show chunk boundaries by default */
export const SHOW_CHUNK_BOUNDARIES = false 

// ============================================================================
// FOCAL CHUNK STYLING CONSTANTS
// ============================================================================

/** Scale factor for focal image (shrink to fit within chunk bounds) */
export const FOCAL_IMAGE_SCALE = 1.5

/** Border radius for focal image in pixels */
export const FOCAL_IMAGE_BORDER_RADIUS = 12

/** Shadow configuration for focal image */
export const FOCAL_IMAGE_SHADOW = '0 10px 25px -5px rgb(0 0 0 / 0.15), 0 4px 10px -2px rgb(0 0 0 / 0.1)'

/** Background color for focal chunk */
export const FOCAL_CHUNK_BACKGROUND = 'rgba(255, 255, 255, 0.8)'

// ============================================================================
// GRID POSITIONING CONSTANTS
// ============================================================================

/** Grid origin X coordinate - chunks are positioned relative to this center point */
export const GRID_ORIGIN_X = 0

/** Grid origin Y coordinate - chunks are positioned relative to this center point */
export const GRID_ORIGIN_Y = 0

// ============================================================================
// AXIS AND STYLING CONSTANTS
// ============================================================================

/** Axis line color and opacity */
export const AXIS_LINE_COLOR = 'rgba(0, 0, 0, 0.3)'

/** Axis line thickness in pixels */
export const AXIS_LINE_THICKNESS = 0

// ============================================================================
// Z-INDEX CONSTANTS
// ============================================================================

/** Z-index for axis lines */
export const Z_INDEX_AXIS_LINES = 1