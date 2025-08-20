# Legacy Grid Implementation

This directory contains the original chunk-based grid implementation that was replaced by the new column carry-over system.

## Why it was replaced:

- **Horizontal gaps**: Fixed-height chunks caused visible gaps between chunks
- **Limited scrolling**: Hard chunk limits created artificial boundaries  
- **Layout shifts**: Late-arriving data could cause chunks to change height
- **Complex virtualization**: Chunk-based cleanup was less efficient

## Files:

- `draggable-image-grid-legacy.tsx` - Main legacy grid component
- `grid/` - Legacy grid hooks and utilities

## New Implementation:

The new grid system (now in `/components/grid/`) uses:
- Column carry-over between chunks per vertical strip
- Absolute world positioning (no gaps)
- Distance-based culling (true infinite scrolling)  
- Seamless masonry layout

This legacy implementation is preserved for comparison purposes only.
