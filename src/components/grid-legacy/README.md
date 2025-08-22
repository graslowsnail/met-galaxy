# Grid Legacy Components

This directory contains shared utilities, hooks, and types that are used by the current grid implementation.

## Components

- `grid/` - Shared grid utilities, hooks, and types
  - `hooks/` - Viewport, virtualization, and other grid hooks
  - `types/` - TypeScript type definitions for grid components
  - `utils/` - Constants, calculations, and utility functions
  - `ChunkManager.tsx` - Chunk management for infinite scrolling
  - `GridRenderer.tsx` - Grid rendering component
  - `ChunkComponent.tsx` - Individual chunk component
  - `ChunkSkeleton.tsx` - Loading skeleton for chunks

## Note

The legacy `draggable-image-grid-legacy.tsx` component has been removed for codebase cleanup. 
The current implementation uses `src/components/draggable-image-grid.tsx` which leverages these shared utilities.

## Usage

These components are used by:
- `src/components/draggable-image-grid.tsx` - Main grid component
