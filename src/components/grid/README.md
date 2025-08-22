# Grid Components

This directory contains the core grid system utilities, hooks, and types used for the infinite scrolling draggable image grid.

## Components

- `hooks/` - Viewport, virtualization, and other grid hooks
- `types/` - TypeScript type definitions for grid components
- `utils/` - Constants, calculations, and utility functions
- `ChunkManager.tsx` - Chunk management for infinite scrolling
- `GridRenderer.tsx` - Grid rendering component
- `ChunkComponent.tsx` - Individual chunk component
- `ChunkSkeleton.tsx` - Loading skeleton for chunks

## Usage

These components are used by:
- `src/components/draggable-image-grid.tsx` - Main grid component
