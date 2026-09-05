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

export const ARTWORK_TILE_WIDTH = 160

/** Gap between items in pixels */
export const GAP = 16

/** Match the artwork field's tile width at both breakpoints. */
export const MOBILE_GRID_SCALE = ARTWORK_TILE_WIDTH / COLUMN_WIDTH

export const DESKTOP_GRID_SCALE = ARTWORK_TILE_WIDTH / COLUMN_WIDTH

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
export const VIEWPORT_BUFFER = 600

/** Maximum chunks to render simultaneously (keep this small for performance!) */
export const MAX_RENDERED_CHUNKS = 24

/** Maximum chunk data to cache (can be larger than rendered chunks) */
export const MAX_DATA_CACHE = 150

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
// GLIDE (POST-DRAG MOMENTUM) CONSTANTS
// ============================================================================

/**
 * Fraction of the glide velocity retained per 60fps frame. Lower = shorter
 * glide. The decay is applied as FRICTION^(elapsedMs / 16.67) so the feel is
 * identical on 60Hz and 120Hz displays.
 */
export const GLIDE_FRICTION = 0.96

/** Release speed in px/s below which no glide starts (a slow drag just stops) */
export const GLIDE_MIN_START_SPEED = 120

/**
 * Speed in px/s at which the glide is considered finished. Measured on device:
 * at 15 the last ~800ms of a flick only travels ~36px, which reads as the grid
 * crawling rather than settling, so it stops once the motion stops being useful.
 */
export const GLIDE_MIN_STOP_SPEED = 40

/** Upper bound on glide speed in px/s, so a hard flick can't teleport the viewport */
export const GLIDE_MAX_SPEED = 4500

/** Window in ms of recent pointer samples used to measure release velocity */
export const GLIDE_VELOCITY_WINDOW = 100

/**
 * Largest frame delta in ms the glide will integrate. Guards against the jump
 * that a paused rAF (backgrounded tab) would otherwise produce on resume.
 */
export const GLIDE_MAX_FRAME_DELTA = 64



// ============================================================================
// CSS STYLING CONSTANTS
// ============================================================================

/** Background color for the grid container */
export const GRID_BACKGROUND_COLOR = '#EDE9E5'

/** Axis line color and opacity */
export const AXIS_LINE_COLOR = 'rgba(0, 0, 0, 0.3)'

/** Axis line thickness in pixels */
export const AXIS_LINE_THICKNESS = 0

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
// DEBUGGING CONSTANTS
// ============================================================================

/** Whether to enable verbose console logging */
export const DEBUG_LOGGING = false

/** Whether to show chunk boundaries by default */
export const SHOW_CHUNK_BOUNDARIES = false 
