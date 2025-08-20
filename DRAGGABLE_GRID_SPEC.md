# DraggableImageGrid Component Specification

## Overview
The `DraggableImageGrid` is a complex infinite scrolling image grid component that displays Metropolitan Museum of Art artworks in a draggable, virtualized grid layout. It supports similarity search and provides smooth pan/zoom interactions.

## Component Architecture

### Core Component: `DraggableImageGrid`
**File**: `src/components/draggable-image-grid.tsx`

#### Primary Responsibilities
1. **Viewport Management**: Handles drag interactions and viewport positioning
2. **State Coordination**: Manages similarity view toggling and artwork selection
3. **Event Delegation**: Routes user interactions to appropriate handlers
4. **Grid Orchestration**: Coordinates the rendering of the infinite grid

#### Key Features
- ✅ Mouse and touch drag support
- ✅ Artwork click detection (prevents clicks during drag)
- ✅ Similarity view navigation
- ✅ Smooth viewport transitions
- ✅ Performance-optimized rendering

---

## Hook Dependencies

### 1. `useViewport` Hook
**File**: `src/components/grid/hooks/useViewport.ts`

#### Responsibilities
- Viewport dimension tracking (window resize handling)
- Drag state management (mouse & touch events)
- Translation coordinate management
- Post-drag callback system
- Viewport bounds calculation

#### Key State
```typescript
{
  translate: { x: number, y: number },
  isDragging: boolean,
  isInitialized: boolean,
  viewportDimensions: { width: number, height: number }
}
```

#### Event Handlers
- `handleMouseDown` - Initiates drag
- `handleTouchStart` - Touch drag support
- Global mouse/touch move/end listeners
- Window resize listener

---

## Grid System Architecture

### 2. `ChunkManager` Component
**File**: `src/components/grid/ChunkManager.tsx`

#### Core Concept: Grid Cells
The grid is organized into discrete **chunks** (grid cells):
- Each chunk is positioned at `(chunkX, chunkY)` coordinates
- Fixed size: `CHUNK_WIDTH × CHUNK_HEIGHT` pixels
- Contains up to `CHUNK_SIZE` (20) images in a masonry layout
- Independent positioning system within each chunk

#### Responsibilities
- **Data Coordination**: Connects `useChunkData` with `useVirtualization`
- **Chunk Lifecycle**: Creates, loads, and manages chunk instances
- **Performance Management**: Handles chunk loading/unloading
- **Layout Orchestration**: Manages chunk positioning in grid

#### Key Processes
1. **Virtualization**: Determines which chunks are visible
2. **Data Fetching**: Loads artwork data for visible chunks
3. **Chunk Creation**: Generates chunk objects with positioned images
4. **Rendering Coordination**: Passes data to `GridRenderer`

### 3. `useChunkData` Hook
**File**: `src/components/grid/hooks/useChunkData.ts`

#### Responsibilities
- **API Integration**: Fetches artwork data from backend
- **Intelligent Caching**: LRU cache with configurable limits
- **Request Deduplication**: Prevents duplicate concurrent requests
- **Error Handling**: Manages loading states and errors
- **Batch Operations**: Parallel chunk fetching

#### Cache Strategy
- Maximum `MAX_DATA_CACHE` (100) entries
- LRU eviction when cache is full
- Separate loading state tracking
- Automatic cleanup

### 4. `useVirtualization` Hook
**File**: `src/components/grid/hooks/useVirtualization.ts`

#### Responsibilities
- **Visibility Calculation**: Determines which chunks are in viewport
- **Buffer Management**: Loads chunks outside viewport for smooth scrolling
- **Render Limiting**: Caps maximum rendered chunks for performance
- **Cleanup Logic**: Removes distant chunks from memory

#### Key Calculations
- Viewport bounds with buffer zone
- Chunk intersection testing
- Distance-based chunk prioritization
- Performance-based render limiting

---

## Rendering Pipeline

### 5. `GridRenderer` Component
**File**: `src/components/grid/GridRenderer.tsx`

#### Responsibilities
- **Chunk Rendering**: Orchestrates individual chunk components
- **Loading States**: Shows skeletons for loading chunks
- **Debug Overlay**: Performance metrics and debugging info
- **Axis Lines**: Coordinate system visualization (optional)

#### Sub-Components
- `ChunkComponent` - Renders individual chunks
- `ChunkSkeleton` - Loading placeholders
- `PerformanceOverlay` - Debug information
- `LoadingIndicators` - Combined loading state management

### 6. `ChunkComponent`
**File**: `src/components/grid/ChunkComponent.tsx`

#### Responsibilities
- **Image Layout**: Positions images within chunk bounds
- **Masonry Logic**: Calculates column-based image placement
- **Click Handling**: Image interaction events
- **Visual States**: Hover effects, loading states

---

## Configuration & Constants

### 7. Constants System
**File**: `src/components/grid/utils/constants.ts`

#### Grid Layout
```typescript
COLUMN_WIDTH = 280px        // Width of masonry columns
GAP = 16px                 // Space between images
CHUNK_SIZE = 20            // Images per chunk
COLUMNS_PER_CHUNK = 4      // Masonry columns per chunk
CHUNK_WIDTH = 1172px       // Total chunk width
CHUNK_HEIGHT = 1600px      // Fixed chunk height
```

#### Performance
```typescript
VIEWPORT_BUFFER = 100px     // Smooth scrolling buffer
MAX_RENDERED_CHUNKS = 12    // Performance limit
MAX_DATA_CACHE = 100        // Cache size limit
```

#### Interaction
```typescript
POST_DRAG_UPDATE_DELAY = 100ms    // Smooth UX delay
VIEWPORT_CHANGE_THRESHOLD = 150px  // Update sensitivity
```

---

## Type System

### 8. Core Types
**File**: `src/components/grid/types/grid.ts`

#### Primary Interfaces
```typescript
interface ImageItem {
  id: string
  src: string
  width: number
  height: number
  aspectRatio: number
  chunkX: number
  chunkY: number
  localIndex: number
  // Database metadata
  databaseId?: number
  objectId?: number
  title?: string
  artist?: string
}

interface Chunk {
  id: string
  x: number  // Grid coordinates
  y: number
  images: ImageItem[]
  positions: PositionedImage[]
  bounds: BoundingBox
  actualHeight: number
}

interface ViewportState {
  width: number
  height: number
  translateX: number
  translateY: number
}
```

---

## Integration Points

### 9. Similarity View
**File**: `src/components/similarity-grid-page.tsx`

#### Integration
- Triggered by artwork clicks in main grid
- Uses `databaseId` from clicked artwork
- Fetches similar artworks via `useSimilarArtworks` hook
- Renders separate draggable similarity grid
- Returns to main grid via close button

#### Key Features
- **Centered Layout**: Original artwork in center
- **Spiral Arrangement**: Similar artworks in golden ratio spiral
- **Size Correlation**: Image size reflects similarity score
- **Ranking System**: Numbered badges for similarity rank

### 10. API Integration
**Files**: 
- `src/hooks/use-artworks.ts`
- `src/hooks/use-similar-artworks.ts`
- `src/lib/api-client.ts`

#### Data Flow
1. `ChunkManager` requests chunk data
2. `useChunkData` calls `apiClient.getChunkArtworks()`
3. API returns `Artwork[]` with Met Museum metadata
4. Data transformed to `ImageItem[]` for rendering
5. Similarity searches use `databaseId` field

---

## Performance Characteristics

### Memory Management
- **Virtualization**: Only renders visible chunks
- **LRU Caching**: Automatic data cache cleanup
- **Render Limiting**: Maximum 12 concurrent chunks
- **Image Optimization**: Uses `primaryImageSmall` when available

### Interaction Performance
- **Drag Optimization**: `willChange: transform` during drag
- **Event Throttling**: RAF-based updates
- **State Batching**: Efficient React state updates
- **Post-Drag Delays**: Smooth UX transitions

---

## Current Issues & Improvement Areas

### 1. Code Organization
- ❌ **Monolithic hooks**: `useViewport` and `ChunkManager` are too large
- ❌ **Mixed concerns**: Data fetching mixed with rendering logic
- ❌ **Complex dependencies**: Circular hook dependencies
- ❌ **Inconsistent patterns**: Different state management approaches

### 2. Performance Issues
- ⚠️ **Memory leaks**: Potential cleanup issues in event listeners
- ⚠️ **Inefficient updates**: Too many re-renders during drag
- ⚠️ **Large bundle**: Heavy component tree
- ⚠️ **Cache management**: Could be more intelligent

### 3. User Experience
- ⚠️ **Loading states**: Could be smoother
- ⚠️ **Error handling**: Limited error recovery
- ⚠️ **Mobile support**: Touch interactions could be better
- ⚠️ **Accessibility**: Missing ARIA labels and keyboard support

---

## Recommended Refactor Approach

### Phase 1: Separation of Concerns
1. **Extract viewport logic** into smaller, focused hooks
2. **Separate data fetching** from rendering coordination
3. **Create dedicated event system** for inter-component communication
4. **Simplify component hierarchy** and reduce prop drilling

### Phase 2: Performance Optimization
1. **Implement proper memoization** for expensive calculations
2. **Optimize rendering pipeline** with better React patterns
3. **Improve memory management** with better cleanup
4. **Add progressive loading** for smoother UX

### Phase 3: Code Quality
1. **Add comprehensive error boundaries**
2. **Implement proper TypeScript patterns**
3. **Add unit tests** for core logic
4. **Improve accessibility** and keyboard navigation

### Phase 4: Feature Enhancement
1. **Add zoom functionality**
2. **Implement search and filtering**
3. **Add keyboard shortcuts**
4. **Improve mobile experience**

---

## Dependencies & External Integrations

### React Hooks Used
- `useState` - Local component state
- `useEffect` - Side effects and cleanup
- `useCallback` - Function memoization
- `useRef` - DOM references and mutable values

### External Libraries
- **API Client**: Custom fetch wrapper
- **TypeScript**: Full type safety
- **CSS Modules**: Styled with Tailwind classes
- **Next.js**: Framework integration

### Backend API Requirements
- `GET /api/artworks/chunk` - Chunk data fetching
- `GET /api/artworks/similar` - Similarity search
- Requires `chunkX`, `chunkY`, `count` parameters
- Returns paginated artwork data with image URLs

---

This specification provides a complete breakdown of your current draggable grid implementation. The component is functionally complex but has several areas for improvement in terms of code organization, performance, and maintainability.
