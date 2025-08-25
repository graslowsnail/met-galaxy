# Multi-Chunk API Specification

## Overview
This API extends the existing `/field-chunk` endpoint to support fetching multiple chunks with perfect deduplication across all chunks in a single request.

## Endpoint
```
POST /api/artworks/field-chunks
```

## Request Format

### Headers
```
Content-Type: application/json
```

### Body
```typescript
{
  targetId: number;           // Focal artwork ID (required)
  chunks: Array<{             // Array of chunk coordinates (required, max 16)
    x: number;                // Chunk X coordinate
    y: number;                // Chunk Y coordinate
  }>;
  count: number;              // Artworks per chunk (default: 20, max: 50)
  seed?: number;              // Global seed for reproducibility (optional)
  excludeIds?: number[];      // Artwork IDs to exclude globally (optional)
}
```

### Example Request
```json
{
  "targetId": 12345,
  "chunks": [
    { "x": 0, "y": 1 },
    { "x": 1, "y": 0 },
    { "x": 1, "y": 1 },
    { "x": -1, "y": 1 }
  ],
  "count": 20,
  "excludeIds": [67890, 11111]
}
```

## Response Format

```typescript
{
  success: boolean;
  meta: {
    targetId: number;         // Echo of request targetId
    totalChunks: number;      // Number of chunks processed
    globalExcludes: number;   // Total excluded artwork count
    seed: number;             // Seed used for randomization
    t: number;                // Overall time parameter
  };
  data: {
    [chunkKey: string]: {     // Key format: "x,y" (e.g., "0,1", "1,-1")
      chunk: { 
        x: number; 
        y: number; 
      };
      artworks: Array<{
        id: number;
        objectId: number;
        title: string | null;
        artist: string | null;
        imageUrl: string | null;
        originalImageUrl: string | null;
        imageSource: string;
        similarity?: number | null;
        source: 'sim' | 'drift' | 'rand';
      }>;
      meta: {
        r: number;            // Distance from origin
        theta: number;        // Angle in radians
        t: number;            // Interpolation parameter 0-1
        weights: {
          sim: number;        // Similarity weight
          drift: number;      // Drift weight
          rand: number;       // Random weight
        };
      };
    };
  };
  responseTime: string;       // e.g., "145ms"
}
```

### Example Response
```json
{
  "success": true,
  "meta": {
    "targetId": 12345,
    "totalChunks": 4,
    "globalExcludes": 3,
    "seed": 1234567890,
    "t": 0.85
  },
  "data": {
    "0,1": {
      "chunk": { "x": 0, "y": 1 },
      "artworks": [
        {
          "id": 99999,
          "objectId": 435844,
          "title": "The Starry Night",
          "artist": "Vincent van Gogh",
          "imageUrl": "https://...",
          "originalImageUrl": "https://...",
          "imageSource": "s3",
          "similarity": 0.92,
          "source": "sim"
        }
        // ... 19 more artworks
      ],
      "meta": {
        "r": 1.0,
        "theta": 1.57,
        "t": 0.1,
        "weights": { "sim": 0.81, "drift": 0.18, "rand": 0.01 }
      }
    },
    "1,0": {
      "chunk": { "x": 1, "y": 0 },
      "artworks": [ /* ... */ ],
      "meta": { /* ... */ }
    },
    "1,1": {
      "chunk": { "x": 1, "y": 1 },
      "artworks": [ /* ... */ ],
      "meta": { /* ... */ }
    },
    "-1,1": {
      "chunk": { "x": -1, "y": 1 },
      "artworks": [ /* ... */ ],
      "meta": { /* ... */ }
    }
  },
  "responseTime": "145ms"
}
```

## Implementation Logic

### 1. Global Deduplication Strategy
```javascript
// Build master exclude set from all sources
const globalExcludes = new Set([
  targetId,
  ...(excludeIds || [])
]);

// Track used artworks across ALL chunks
const globalUsed = new Set(globalExcludes);
```

### 2. Enhanced Similarity Pool Generation
```javascript
// Generate larger pools for multiple chunks (scale up from single chunk limits)
const simTight = await db.select(/* your existing query */)
  .limit(Math.min(500, chunks.length * 125));  // Scale based on chunk count

const simDrift = await db.select(/* your existing query */)
  .limit(Math.min(800, chunks.length * 200));  // Scale based on chunk count

const randPool = await db.select(/* your existing query */)
  .limit(Math.min(1200, chunks.length * 300)); // Scale based on chunk count
```

### 3. Chunk Processing Order
```javascript
// Process chunks by distance (closest first for better similarity distribution)
const sortedChunks = chunks.sort((a, b) => {
  const rA = Math.hypot(a.x, a.y);
  const rB = Math.hypot(b.x, b.y);
  return rA - rB;
});

// Process each chunk using existing logic but with global deduplication
const results = {};
for (const [index, chunk] of sortedChunks.entries()) {
  const chunkResults = await processChunk(chunk, globalUsed, index);
  results[`${chunk.x},${chunk.y}`] = chunkResults;
  
  // Update global used set
  chunkResults.artworks.forEach(artwork => globalUsed.add(artwork.id));
}
```

### 4. Enhanced Spatial Partitioning
```javascript
// Improved spatial offset calculation for better deduplication
const getSpatialOffset = (chunkX, chunkY, globalSeed, chunkIndex) => {
  const r = Math.hypot(chunkX, chunkY);
  if (r < 3) { // Expand range for spatial partitioning
    return hash32(chunkX + 100, chunkY + 100, globalSeed, chunkIndex) % 100;
  }
  return chunkIndex * 25; // Stagger distant chunks
};

// Apply offset to pools before processing
const spatialOffset = getSpatialOffset(chunkX, chunkY, seed, chunkIndex);
const simTightQ = simTight.slice(spatialOffset).concat(simTight.slice(0, spatialOffset));
// ... similar for other pools
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request",
  "details": "chunks array must contain 1-16 chunk objects"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Target artwork not found",
  "targetId": 12345
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database query failed",
  "message": "Connection timeout"
}
```

## Performance Considerations

1. **Request Limits**: 
   - Maximum 16 chunks per request
   - Maximum 50 artworks per chunk

2. **Pool Scaling**: 
   - Similarity pools scale with chunk count
   - Prevents exhausting available artworks

3. **Processing Order**: 
   - Closer chunks processed first
   - Better similarity distribution

4. **Spatial Optimization**: 
   - Enhanced spatial partitioning for adjacent chunks
   - Reduces likelihood of similar results

## Compatibility Notes

- Maintains full compatibility with existing `/field-chunk` endpoint
- Uses same similarity calculation logic and weighting
- Same response format for individual chunk data
- Same error handling patterns

## Testing Scenarios

1. **Single chunk**: Should work identically to `/field-chunk`
2. **Adjacent chunks**: Should have zero duplicates
3. **Distant chunks**: Should have minimal duplicates
4. **Large requests**: 16 chunks with 50 artworks each
5. **Error cases**: Invalid targetId, malformed chunks array

This API will eliminate duplicate artworks across adjacent chunks while maintaining the sophisticated similarity logic already implemented in the single-chunk endpoint.