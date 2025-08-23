# Simplified Similarity Grid Implementation

## Summary

This is a simplified implementation of the similarity grid that fixes the performance and rendering issues by copying the architecture of the working draggable grid.

## Key Changes

### 1. Simplified Architecture
- **Before**: Complex multi-layer system with SimilarityGridRenderer → SimilarityChunkManager → useSimilarityChunkData
- **After**: Simple 2-layer system like draggable grid: SimilarityGrid → SimilarityChunkManagerSimple → useSimilarityChunkDataSimple

### 2. Fixed API Calls  
- **Before**: Multiple API calls (similarity API + field-chunk API + random API fallback) causing duplicates
- **After**: Single consistent API strategy:
  - Focal chunk (0,0): Display user's selected image 
  - All other chunks: Use field-chunk API with focal artwork ID

### 3. Simplified Chunk IDs
- **Before**: Complex format `${focalId}:${chunkX},${chunkY}` causing cache invalidation
- **After**: Simple format `${chunkX},${chunkY}` like draggable grid

### 4. Removed Complexity
- **Removed**: Similarity zones, ring-based layouts, complex positioning logic
- **Kept**: Simple masonry layout like draggable grid

## Files Created

### Core Components
1. **`useSimilarityChunkDataSimple.ts`** - Data fetching hook based on draggable grid's useChunkData
2. **`SimilarityChunkManagerSimple.tsx`** - Chunk manager based on draggable grid's ChunkManager  
3. **Modified `similarity-grid.tsx`** - Simplified main component

## How It Works

1. **Focal Chunk (0,0)**: Displays the user's selected artwork passed as `focalArtwork` prop
2. **Other Chunks**: Use field-chunk API with `targetId: focalArtworkId` to get related images
3. **Rendering**: Uses same masonry layout and virtualization as draggable grid
4. **Navigation**: Parent component can handle navigation by updating `focalArtwork` prop

## Usage

```tsx
<SimilarityGrid
  initialArtworkId={selectedArtwork.id}
  focalArtwork={{
    id: selectedArtwork.id,
    title: selectedArtwork.title,
    artist: selectedArtwork.artist,
    imageUrl: selectedArtwork.imageUrl,
    originalImageUrl: selectedArtwork.originalImageUrl
  }}
  onArtworkClick={(image) => {
    // Handle navigation - can update focalArtwork to navigate
  }}
  onClose={() => {
    // Handle closing similarity view
  }}
  showPerformanceOverlay={true}
/>
```

## Expected Results

- ✅ Same smooth performance as draggable grid
- ✅ No duplicate API calls or wrong image rendering  
- ✅ Simple, maintainable architecture
- ✅ Focal image in center with related images in surrounding chunks
- ✅ Consistent chunk loading and virtualization behavior