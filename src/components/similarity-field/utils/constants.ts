/**
 * Constants for the SimilarityField component system
 * 
 * This file contains all configuration constants used across the similarity field components.
 * Regular chunks use the home gallery's geometry at its displayed scale.
 */

import {
  ARTWORK_TILE_WIDTH,
  COLUMN_WIDTH as HOME_COLUMN_WIDTH,
  GAP as HOME_GAP,
  AXIS_MARGIN as HOME_AXIS_MARGIN,
  MIN_IMAGE_HEIGHT as HOME_MIN_IMAGE_HEIGHT,
  DESKTOP_GRID_SCALE,
} from '../../grid-legacy/grid/utils/constants'

// ============================================================================
// GRID LAYOUT CONSTANTS
// ============================================================================

/** Width of each column in pixels - drives the effective "zoom" of the field */
export const COLUMN_WIDTH = ARTWORK_TILE_WIDTH

/** Match the home gallery's displayed gap. */
export const GAP = HOME_GAP * DESKTOP_GRID_SCALE

/** Number of rows per chunk (approximate for masonry layout) */
export const COLUMNS_PER_CHUNK = 3
export const ROWS_PER_CHUNK = 3
export const CHUNK_SIZE = COLUMNS_PER_CHUNK * ROWS_PER_CHUNK

/** Number of images in the focal chunk (should be 1 for single focal image) */
export const FOCAL_CHUNK_SIZE = 1

/** Space around the axis lines in pixels */
export const AXIS_MARGIN = HOME_AXIS_MARGIN * DESKTOP_GRID_SCALE

/** Minimum image height in pixels to prevent very short images */
export const MIN_IMAGE_HEIGHT = HOME_MIN_IMAGE_HEIGHT * DESKTOP_GRID_SCALE

export const CHUNK_LAYOUT = {
  width: COLUMNS_PER_CHUNK * (HOME_COLUMN_WIDTH + HOME_GAP) + 2 * HOME_AXIS_MARGIN,
  height: Math.round(ROWS_PER_CHUNK * (HOME_COLUMN_WIDTH * 1.15 + HOME_GAP) + 2 * HOME_AXIS_MARGIN),
  columns: COLUMNS_PER_CHUNK,
}

/** Width includes margins - total width of each chunk */
export const CHUNK_WIDTH = CHUNK_LAYOUT.width * DESKTOP_GRID_SCALE

/** Height includes margins - derived so masonry columns naturally fill the chunk */
export const CHUNK_HEIGHT = CHUNK_LAYOUT.height * DESKTOP_GRID_SCALE

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

export const FOCAL_IMAGE_WIDTH = 'min(80vw, 400px)'
export const FOCAL_IMAGE_HEIGHT = 'min(65vh, 480px)'

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
