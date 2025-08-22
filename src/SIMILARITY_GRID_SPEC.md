# Similarity Grid Specification

A comprehensive specification for the infinite similarity exploration grid system built for the Met Galaxy application.

## Overview

The Similarity Grid is an infinite, viewport-based image exploration system that allows users to discover artworks through visual similarity relationships. It provides an immersive way to explore collections by starting with a focal artwork and expanding outward through rings of increasingly distant relationships.

## Core Architecture

### Grid Structure
- **Infinite Grid System**: Extends infinitely in all directions from a central focal point (0,0)
- **Chunk-Based Organization**: Images organized into discrete 1184px × 1600px chunks
- **Ring-Based Similarity**: Content organized in concentric rings around the focal artwork
- **Masonry Layout**: Each chunk uses a 4-column masonry layout matching the main grid

### Chunk Types & Content Distribution

#### Focal Chunk (0,0)
- **Content**: Single centered artwork (the clicked image)
- **Size**: 400px × 400px centered within chunk
- **Layout**: Single image, no masonry
- **Purpose**: Central focus point for similarity exploration

#### Ring 1: High Similarity (8 chunks)
- **Positions**: Immediately adjacent to focal chunk (distance = 1)
- **Content**: Up to 160 similar artworks from `/api/artworks/similar/:id`
- **Distribution**: ~20 similar images per chunk
- **Layout**: 4-column masonry matching main grid
- **API Source**: CLIP embedding similarity scores

#### Ring 2+: Mixed & Random (infinite)
- **Positions**: All chunks at distance ≥ 2 from focal
- **Content**: Pure random artworks from `/api/artworks/random`
- **Distribution**: 20 random images per chunk
- **Layout**: 4-column masonry matching main grid
- **Purpose**: Infinite exploration beyond similarity

## Technical Implementation

### Data Flow
```
1. User clicks artwork in main grid
2. Similarity API call: GET /api/artworks/similar/:id
3. Focal chunk (0,0) created with clicked artwork
4. Ring 1 chunks populated with similar artworks
5. Ring 2+ chunks populated on-demand with random artworks
6. Infinite loading as user scrolls/drags
```

### Viewport Management
- **Trackpad Support**: Natural 2-finger scrolling with momentum
- **Mouse Drag**: Click and drag to navigate
- **Touch Support**: Touch drag on mobile devices
- **Smooth Transitions**: RAF-throttled updates for 60fps performance
- **Viewport Centering**: Automatic centering on focal artwork

### Performance Optimizations
- **Virtualization**: Only renders visible chunks (typically 12-24)
- **LRU Caching**: Maintains up to 150 chunks in memory
- **RAF Throttling**: Smooth scrolling with requestAnimationFrame
- **Lazy Loading**: Chunks load only when entering viewport
- **Parallel API Calls**: Multiple chunks fetch data simultaneously

## API Integration

### Similarity Endpoint
```
GET /api/artworks/similar/:id
Returns: {
  data: SimilarArtwork[],  // Array of similar artworks
  meta: {
    targetId: number,      // Original artwork ID
    targetTitle: string,   // Original artwork title
    targetArtist: string   // Original artwork artist
  }
}
```

### Random Chunks Endpoint
```
GET /api/artworks/chunk?chunkX={x}&chunkY={y}&count=20
Returns: {
  artworks: Artwork[],    // Array of random artworks
  total: number          // Total count
}
```

### Deterministic Seeds
- Each chunk uses deterministic seeding based on coordinates
- Ensures consistent content across sessions
- Hash function: `Math.abs(chunkX * 1337 + chunkY * 271)`

## User Interactions

### Navigation
- **Trackpad Scrolling**: Natural 2-finger scroll in any direction
- **Mouse Dragging**: Click and drag to pan around grid
- **Touch Dragging**: Touch and drag on mobile
- **Momentum**: Smooth deceleration after drag ends

### Image Interactions
- **Click to Refocus**: Click any artwork to make it the new focal point
- **Smooth Transitions**: Automatic centering on new focal artwork
- **Navigation History**: Back button to return to previous focal images
- **Visual Feedback**: Hover effects and smooth animations

### UI Controls
- **Back to Grid**: Return to main infinite grid
- **Navigation History**: Step back through previously focused artworks
- **History Counter**: Shows number of steps in navigation stack

## Layout System

### Masonry Implementation
```typescript
// Matching main grid exactly
const COLUMN_WIDTH = 280
const GAP = 16  
const COLUMNS_PER_CHUNK = 4
const CHUNK_WIDTH = 1184  // 4 columns + gaps + margins
const CHUNK_HEIGHT = 1600
```

### Image Sizing
- **Dynamic Heights**: Based on deterministic aspect ratios
- **Consistent Widths**: All images 280px wide
- **Variety**: 12 different aspect ratios for visual interest
- **Minimum Height**: 100px to prevent extremely short images

### Focal Image Layout
- **Size**: 400px × 400px
- **Position**: Centered within focal chunk
- **Styling**: Blue ring highlight (4px, #3B82F6)
- **Responsive**: Maintains aspect ratio and centering

## State Management

### Grid State
```typescript
interface SimilarityGridState {
  currentFocalId: number              // Current focal artwork ID
  focalImagePosition: Position        // Focal image coordinates
  loadedChunks: Map<string, Chunk>   // Cache of loaded chunks
  visibleChunks: ChunkCoordinates[]  // Currently visible chunks
  navigationHistory: number[]        // Stack of previous focal IDs
  isTransitioning: boolean           // Loading state flag
  similarityData: SimilarityData     // API response data
  isLoadingSimilarity: boolean       // API loading state
}
```

### Chunk Management
- **LRU Cache**: Maximum 150 chunks in memory
- **Loading States**: Track which chunks are currently loading
- **Error Handling**: Graceful fallback for failed chunk loads
- **Race Condition Prevention**: Similarity data waits for API completion

## Rendering Pipeline

### Virtualization
1. Calculate visible chunks based on viewport bounds
2. Add buffer chunks around viewport for smooth scrolling
3. Force-render essential chunks (focal + Ring 1) when similarity data available
4. Remove chunks outside maximum render limit (12-24 chunks)

### Image Rendering
```typescript
// Each image renders as:
<img
  src={artwork.primaryImageSmall || artwork.primaryImage}
  alt={artwork.title}
  className="rounded-lg shadow-sm hover:shadow-md transition-shadow"
  onClick={() => handleImageClick(artwork)}
/>
```

### Chunk Boundaries
- **Debug Mode**: Optional red borders showing chunk boundaries
- **Production**: Seamless infinite grid appearance
- **Masonry Flow**: Images flow naturally within chunk boundaries

## Error Handling

### API Failures
- **Similarity API**: Graceful fallback to random images in Ring 1
- **Random API**: Retry logic with exponential backoff
- **Network Errors**: User-friendly error messages with retry options

### Data Validation
- **Image URLs**: Fallback to placeholder for broken images
- **Metadata**: Handle missing titles, artists, dates gracefully
- **Similarity Scores**: Validate numeric ranges and sort order

### Memory Management
- **Chunk Cleanup**: Remove distant chunks to prevent memory leaks
- **Image Unloading**: Browser handles image garbage collection
- **Cache Limits**: Enforce maximum cache size (150 chunks)

## Performance Characteristics

### Target Metrics
- **Initial Load**: < 2 seconds to first paint
- **Chunk Loading**: < 500ms per chunk
- **Scroll Performance**: Consistent 60fps during navigation
- **Memory Usage**: < 200MB for typical session

### Optimization Techniques
- **Image Preloading**: Preload images for visible chunks
- **API Batching**: Group nearby chunk requests
- **RAF Throttling**: Limit scroll updates to display refresh rate
- **Intersection Observer**: Detect chunk visibility efficiently

## Browser Compatibility

### Supported Features
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 14+
- **Mobile Support**: iOS Safari 14+, Chrome Mobile 80+
- **Touch Events**: Full touch navigation support
- **Trackpad**: macOS trackpad gestures

### Progressive Enhancement
- **Fallback Navigation**: Click-only navigation if drag fails
- **Reduced Animations**: Respect user's motion preferences
- **Accessibility**: Keyboard navigation support

## Development Tools

### Debug Features
- **Chunk Boundaries**: Visual chunk outlines
- **Performance Overlay**: FPS counter and memory usage
- **Console Logging**: Detailed chunk loading and similarity assignment logs
- **State Inspector**: React DevTools integration

### Testing Support
- **Deterministic Seeds**: Consistent chunk content for testing
- **Mock API**: Fake similarity and random data
- **Performance Profiling**: Chrome DevTools integration

## Future Enhancements

### Potential Features
- **Zoom Levels**: Multiple detail levels for exploration
- **Search Integration**: Find similar artworks to search results
- **Collections**: Save and share similarity paths
- **Analytics**: Track user exploration patterns

### Performance Improvements
- **WebGL Rendering**: GPU-accelerated image positioning
- **Service Worker**: Offline chunk caching
- **Image Optimization**: WebP format with fallbacks
- **Predictive Loading**: AI-powered chunk preloading

---

*This specification documents the similarity grid as implemented in the Met Galaxy application, providing infinite visual exploration of artwork collections through CLIP embedding-based similarity relationships.*