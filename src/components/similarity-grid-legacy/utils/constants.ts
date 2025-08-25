/**
 * Constants for the legacy SimilarityGrid component system
 * 
 * This file contains all configuration constants used across the legacy similarity grid components.
 * These are separate from the draggable grid constants to allow independent customization.
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
export const SHOW_CHUNK_BOUNDARIES = true 