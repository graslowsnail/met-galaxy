/**
 * Constants for the DraggableImageGrid component system
 * 
 * This file contains all configuration constants used across the grid components.
 * Centralizing constants here makes them easier to maintain and adjust.
 */



// ============================================================================
// GRID LAYOUT CONSTANTS
// ============================================================================

/** Width of each column in pixels */
export const COLUMN_WIDTH = 280

/** Gap between items in pixels */
export const GAP = 16

/** Number of images per chunk */
export const CHUNK_SIZE = 20

/** Number of columns per chunk */
export const COLUMNS_PER_CHUNK = 4

/** Space around the axis lines in pixels */
export const AXIS_MARGIN = 5

/** Width includes margins - total width of each chunk */
export const CHUNK_WIDTH = COLUMNS_PER_CHUNK * (COLUMN_WIDTH + GAP) + (2 * AXIS_MARGIN)

/** Height of each grid cell in pixels */
export const CHUNK_HEIGHT = 1600

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

/** Buffer around viewport for smooth scrolling experience */
export const VIEWPORT_BUFFER = 100

/** Maximum chunks to render simultaneously (keep this small for performance!) */
export const MAX_RENDERED_CHUNKS = 12

/** Maximum chunk data to cache (can be larger than rendered chunks) */
export const MAX_DATA_CACHE = 100

// ============================================================================
// GRID POSITIONING CONSTANTS
// ============================================================================

/** Grid origin X coordinate - chunks are positioned relative to this center point */
export const GRID_ORIGIN_X = 0

/** Grid origin Y coordinate - chunks are positioned relative to this center point */
export const GRID_ORIGIN_Y = 0

// ============================================================================
// ASPECT RATIO CONSTANTS
// ============================================================================

/** Default aspect ratios used for layout calculations when image dimensions are unknown */
export const DEFAULT_ASPECT_RATIOS = [0.7, 0.8, 1.0, 1.2, 1.4, 0.6, 1.6] as const

/** Minimum image height in pixels */
export const MIN_IMAGE_HEIGHT = 100

// ============================================================================
// ANIMATION & INTERACTION CONSTANTS
// ============================================================================

/** Transition duration for smooth animations in milliseconds */
export const TRANSITION_DURATION = 200

/** Delay after drag ends before updating virtualization (for smooth UX) */
export const POST_DRAG_UPDATE_DELAY = 100

/** Threshold for viewport change detection (prevents excessive updates) */
export const VIEWPORT_CHANGE_THRESHOLD = 150

/** Distance threshold in pixels - clicks are blocked if mouse moved more than this */
export const CLICK_MOVE_THRESHOLD = 5

/** Trackpad scroll sensitivity multiplier */
export const TRACKPAD_SPEED = 1.0



// ============================================================================
// CSS STYLING CONSTANTS
// ============================================================================

/** Background color for the grid container */
export const GRID_BACKGROUND_COLOR = '#EDE9E5'

/** Axis line color and opacity */
export const AXIS_LINE_COLOR = 'rgba(0, 0, 0, 0.3)'

/** Axis line thickness in pixels */
export const AXIS_LINE_THICKNESS = 2

/** Chunk border color for debug visualization */
export const CHUNK_BORDER_COLOR = 'rgb(212 212 212)' // neutral-300

/** Image border radius in pixels */
export const IMAGE_BORDER_RADIUS = 8 // lg

/** Shadow configuration for images */
export const IMAGE_SHADOW = {
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // shadow-sm
  hover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // shadow-md
}

// ============================================================================
// Z-INDEX CONSTANTS
// ============================================================================

/** Z-index for chunk boundary outlines */
export const Z_INDEX_CHUNK_OUTLINE = 0

/** Z-index for image containers */
export const Z_INDEX_IMAGES = 1

/** Z-index for axis lines */
export const Z_INDEX_AXIS_LINES = 1

/** Z-index for loading indicator */
export const Z_INDEX_LOADING = 10

/** Z-index for debug info */
export const Z_INDEX_DEBUG = 10

// ============================================================================
// ERROR HANDLING CONSTANTS
// ============================================================================

/** Default error message for image loading failures */
export const IMAGE_ERROR_MESSAGE = 'Image unavailable'

/** Default error message for chunk loading failures */
export const CHUNK_ERROR_MESSAGE = 'Failed to load artwork data'

/** Timeout for API requests in milliseconds */
export const API_TIMEOUT = 10000

// ============================================================================
// DEBUGGING CONSTANTS
// ============================================================================

/** Whether to enable verbose console logging */
export const DEBUG_LOGGING = false

/** Whether to show chunk boundaries by default */
export const SHOW_CHUNK_BOUNDARIES = true 


