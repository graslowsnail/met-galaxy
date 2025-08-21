/**
 * Constants for the DraggableImageGridV2 component system (Column Carry-Over)
 * 
 * Based on the Infinite-Plane Masonry Grid specification.
 * These constants define the core layout and performance parameters.
 */

// ============================================================================
// CORE LAYOUT CONSTANTS (from spec)
// ============================================================================

/** Width of each column in pixels */
export const COLUMN_WIDTH = 280

/** Gap between items in pixels */
export const GAP = 16

/** Number of columns per chunk (strip width) */
export const COLUMNS_PER_CHUNK = 4

/** Number of images per chunk */
export const CHUNK_SIZE = 20

/** Width of each chunk/strip */
export const CHUNK_WIDTH = 
  COLUMNS_PER_CHUNK * COLUMN_WIDTH + (COLUMNS_PER_CHUNK - 1) * GAP

/** Approximate chunk height (only used for coarse virtualization) */
export const CHUNK_HEIGHT = 1600

// ============================================================================
// VIRTUALIZATION CONSTANTS (from spec)
// ============================================================================

/** Buffer around viewport for preloading - increased for infinite scrolling */
export const VIEWPORT_BUFFER_PX = 800

// Removed: MAX_RENDERED_CHUNKS - now using distance-based culling instead

/** Click vs drag movement threshold in pixels */
export const CLICK_MOVE_THRESHOLD = 6

/** Trackpad navigation speed multiplier */
export const TRACKPAD_SPEED = 2.0

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

/** Maximum chunk data to cache (LRU) */
export const MAX_DATA_CACHE = 100

/** RAF throttle delay for viewport updates */
export const RAF_THROTTLE_MS = 16

/** Debounce delay for expensive operations */
export const DEBOUNCE_DELAY_MS = 150

// ============================================================================
// VISUAL CONSTANTS
// ============================================================================

/** Background color for the world plane */
export const WORLD_BACKGROUND_COLOR = '#EDE9E5'

/** Image border radius */
export const IMAGE_BORDER_RADIUS = 8

/** Image shadow styles */
export const IMAGE_SHADOW = {
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  hover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
}

// ============================================================================
// DEBUGGING CONSTANTS
// ============================================================================

/** Enable debug logging */
export const DEBUG_LOGGING = false

/** Show performance overlay by default */
export const SHOW_PERFORMANCE_OVERLAY = true

/** Show loading indicators */
export const SHOW_LOADING_INDICATORS = true

// ============================================================================
// COORDINATE SAFETY LIMITS
// ============================================================================

/** Maximum safe coordinate value for browser rendering (±30M pixels) */
export const MAX_SAFE_COORDINATE = 30000000

/** Maximum safe chunk coordinate to prevent overflow */
export const MAX_SAFE_CHUNK_Y = Math.floor(MAX_SAFE_COORDINATE / CHUNK_HEIGHT)

// ============================================================================
// ERROR HANDLING
// ============================================================================

/** Default error message for failed image loads */
export const IMAGE_ERROR_MESSAGE = 'Image unavailable'

/** API request timeout */
export const API_TIMEOUT_MS = 10000

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/** Default aria-label for image tiles */
export const DEFAULT_ARIA_LABEL = 'Artwork image'

/** Focus ring color */
export const FOCUS_RING_COLOR = 'rgb(59 130 246)' // blue-500
