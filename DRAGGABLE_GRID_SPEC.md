# Draggable Image Grid System Specification

## Overview

The Draggable Image Grid is a high-performance, virtualized infinite grid system for displaying thousands of artwork images with smooth pan/zoom interactions. Built with React, TypeScript, and optimized for both desktop and mobile experiences.

## Architecture

### Component Hierarchy
```
DraggableImageGrid (Entry Point)
├── ChunkManager (Data Management)
├── GridRenderer (Visual Orchestration)
└── ChunkComponent[] (Individual Chunks)
    └── ImageItem[] (Individual Images)
```

### Core Components

#### 1. DraggableImageGrid (`/src/components/draggable-image-grid.tsx`)
**Purpose**: Main entry point and interaction handler

**Props**:
- `onArtworkClick: (artwork: ImageItem) => void` - Callback when image is clicked
- `showPerformanceOverlay?: boolean` - Display performance metrics
- `showLoadingIndicators?: boolean` - Show loading skeletons

**Responsibilities**:
- Viewport management via `useViewport` hook
- Drag interaction handling (mouse & touch)
- Trackpad navigation with natural scrolling
- Click vs drag detection
- Overflow and scrollbar management

#### 2. ChunkManager (`/src/components/grid-legacy/grid/ChunkManager.tsx`)
**Purpose**: Data orchestration and chunk lifecycle management

**Key Features**:
- Async chunk loading with intelligent batching
- Artwork data fetching from API
- Chunk creation from raw artwork data
- Loading state management
- Integration with virtualization system

**Data Flow**:
```
API → ChunkManager → Chunk Creation → Render Queue
```

#### 3. GridRenderer (`/src/components/grid-legacy/grid/GridRenderer.tsx`)
**Purpose**: Visual rendering coordination

**Renders**:
- Coordinate system axis lines
- Loading indicators and skeletons
- Performance overlay with real-time stats
- Chunk components in viewport

#### 4. ChunkComponent (`/src/components/grid-legacy/grid/ChunkComponent.tsx`)
**Purpose**: Individual chunk rendering

**Features**:
- Masonry-style image layout within chunks
- Hover effects and metadata overlays
- Error handling for failed image loads
- Click interaction handling
- Debug boundary visualization

## Configuration

### Constants (`/src/components/grid-legacy/grid/utils/constants.ts`)

```typescript
// Layout Configuration
export const COLUMN_WIDTH = 280;              // Width of each column in pixels
export const CHUNK_SIZE = 20;                 // Number of images per chunk
export const COLUMNS_PER_CHUNK = 4;           // Columns in each chunk
export const CHUNK_WIDTH = 1184;              // Total chunk width (calculated)
export const CHUNK_HEIGHT = 1600;             // Fixed chunk height

// Performance Limits
export const MAX_RENDERED_CHUNKS = 12;        // Maximum chunks rendered simultaneously
export const MAX_DATA_CACHE = 100;            // Maximum cached chunk data
export const VIEWPORT_BUFFER = 100;           // Buffer zone for chunk loading

// Visual Styling
export const GRID_BACKGROUND_COLOR = '#EDE9E5';
export const IMAGE_BORDER_RADIUS = 8;
export const HOVER_SCALE = 1.02;
```

## Data Types

### Core Interfaces (`/src/components/grid-legacy/grid/types/grid.ts`)

```typescript
interface ImageItem {
  id: string;                    // Unique identifier
  databaseId?: number;           // Database ID for API calls
  imageUrl: string;              // Display image URL
  title?: string;                // Artwork title
  artist?: string;               // Artist name
  year?: string;                 // Creation year
  medium?: string;               // Artwork medium
  dimensions?: string;           // Physical dimensions
  width: number;                 // Image width (pixels)
  height: number;                // Image height (pixels)
  aspectRatio: number;           // Calculated aspect ratio
  x: number;                     // Grid X position
  y: number;                     // Grid Y position
}

interface Chunk {
  id: string;                    // Unique chunk identifier
  x: number;                     // Chunk X coordinate
  y: number;                     // Chunk Y coordinate
  images: ImageItem[];           // Images contained in chunk
  isVisible: boolean;            // Currently in viewport
}

interface ViewportState {
  x: number;                     // Current X offset
  y: number;                     // Current Y offset
  width: number;                 // Viewport width
  height: number;                // Viewport height
  scale: number;                 // Current zoom level
}

interface DragState {
  isDragging: boolean;           // Currently dragging
  startX: number;                // Drag start X
  startY: number;                // Drag start Y
  initialViewportX: number;      // Initial viewport X
  initialViewportY: number;      // Initial viewport Y
}
```

## Hooks

### useViewport
**Purpose**: Manages pan/drag interactions and viewport state

**Returns**:
- `viewportState: ViewportState` - Current viewport position and dimensions
- `dragState: DragState` - Current drag interaction state
- `handleMouseDown: (event) => void` - Mouse drag start handler
- `handleTouchStart: (event) => void` - Touch drag start handler

**Features**:
- RAF-throttled updates for smooth performance
- Natural trackpad scrolling support
- Momentum and inertia calculations
- Coordinate system transformations

### useChunkData
**Purpose**: Handles data fetching, caching, and loading states

**Returns**:
- `chunks: Chunk[]` - Array of loaded chunks
- `loading: boolean` - Global loading state
- `loadChunk: (chunkId) => Promise<Chunk>` - Load specific chunk
- `clearCache: () => void` - Clear chunk cache

**Features**:
- LRU cache implementation
- Batch API requests
- Error handling and retry logic
- Loading state management

### useVirtualization
**Purpose**: Determines which chunks should be rendered

**Parameters**:
- `viewportState: ViewportState` - Current viewport
- `chunks: Chunk[]` - Available chunks

**Returns**:
- `visibleChunks: Chunk[]` - Chunks currently in viewport
- `loadingChunks: string[]` - Chunk IDs being loaded

**Algorithm**:
- Calculates viewport boundaries with buffer
- Identifies chunks intersecting viewport
- Prioritizes chunks by distance from center
- Limits total rendered chunks for performance

## Performance Features

### Virtualization Strategy
- **Maximum Rendered Chunks**: 12 concurrent chunks
- **Viewport Buffer**: 100px buffer zone for smooth scrolling
- **Lazy Loading**: Images load only when chunks become visible
- **LRU Cache**: Intelligent cache eviction for memory management

### Optimization Techniques
- **RequestAnimationFrame**: Smooth drag interactions
- **Debounced API Calls**: Prevent excessive server requests
- **Image Preloading**: Strategic preloading of adjacent chunks
- **CSS Transforms**: Hardware-accelerated positioning
- **Component Memoization**: Prevent unnecessary re-renders

### Memory Management
- **Chunk Data Cache**: 100 chunk limit with LRU eviction
- **Image Cleanup**: Automatic cleanup of off-screen images
- **Event Listener Cleanup**: Proper cleanup on component unmount

## Styling Architecture

### CSS-in-JS Approach
- **Styled Components**: Component-scoped styling
- **Tailwind Integration**: Utility classes for common patterns
- **Dynamic Styles**: Runtime style calculations
- **Theme Support**: Centralized color and spacing tokens

### Responsive Design
- **Fluid Layouts**: Adapts to viewport dimensions
- **Touch Interactions**: Optimized for mobile devices
- **Accessibility**: Keyboard navigation and screen reader support

## API Integration

### Data Requirements
```typescript
// Expected API response format
interface ArtworkAPIResponse {
  id: number;
  title: string;
  artist: string;
  primaryImageSmall: string;     // Required for grid display
  objectId: string;
  year?: string;
  medium?: string;
  dimensions?: string;
}
```

### Loading Strategy
- **Chunk-based Loading**: 20 images per API call
- **Progressive Loading**: Load chunks as user navigates
- **Error Handling**: Graceful fallbacks for failed requests
- **Caching**: Client-side cache to reduce redundant requests

## Interaction Patterns

### Navigation
- **Mouse Drag**: Click and drag to pan the grid
- **Touch Gestures**: Native touch scrolling on mobile
- **Trackpad**: Natural 2-finger scrolling with momentum
- **Keyboard**: Arrow keys for precise navigation

### Click Detection
- **Smart Detection**: Differentiates clicks from drags
- **Tolerance**: 5px movement tolerance for click detection
- **Timing**: 200ms maximum for valid clicks
- **Event Handling**: Prevents accidental selections during drag

## Extension Points

### Custom Click Handlers
```typescript
const handleArtworkClick = (artwork: ImageItem) => {
  // Access to full artwork metadata
  console.log('Clicked:', artwork.title, 'by', artwork.artist);
  // Perfect integration point for similarity view
};
```

### Performance Monitoring
```typescript
// Enable performance overlay
<DraggableImageGrid 
  showPerformanceOverlay={true}
  onArtworkClick={handleClick}
/>
```

### Custom Styling
- Override constants for different layouts
- Extend ImageItem interface for additional metadata
- Customize chunk sizing and arrangement

## Known Limitations

- **Fixed Chunk Height**: 1600px height may not suit all aspect ratios
- **Memory Usage**: Large datasets require careful cache management
- **Mobile Performance**: Complex interactions may impact battery life
- **Network Dependency**: Requires stable connection for smooth experience

## Future Enhancements

- **Zoom Functionality**: Pinch-to-zoom support
- **Search Integration**: Filter and highlight matching images
- **Bookmarking**: Save and navigate to specific grid positions
- **Similarity View**: Dedicated component for related image exploration
- **Offline Support**: Cache strategy for offline browsing

## Usage Example

```typescript
import { DraggableImageGrid } from '@/components/draggable-image-grid';

export default function GalleryPage() {
  const handleArtworkClick = (artwork: ImageItem) => {
    console.log('Selected artwork:', artwork);
    // Navigate to similarity view or detail page
  };

  return (
    <DraggableImageGrid
      onArtworkClick={handleArtworkClick}
      showPerformanceOverlay={process.env.NODE_ENV === 'development'}
      showLoadingIndicators={true}
    />
  );
}
```

## Development Notes

### Testing Considerations
- **Performance Testing**: Monitor FPS during drag interactions
- **Memory Leaks**: Watch for memory growth over extended usage
- **Cross-browser**: Test drag interactions across browsers
- **Mobile Testing**: Validate touch gestures on actual devices

### Debugging Tools
- **Performance Overlay**: Real-time metrics display
- **Chunk Boundaries**: Visual debugging for layout issues
- **Console Logging**: Detailed logging for data flow tracking
- **React DevTools**: Component hierarchy and prop inspection

---

*This specification serves as the definitive guide for understanding, maintaining, and extending the Draggable Image Grid system.*