# Similarity Grid - Frontend Specification for Backend Implementation

**Date:** 2025-08-23  
**Version:** 1.0  
**Purpose:** Explain how the similarity grid works and what the field-chunk API needs to support

---

## Overview

The similarity grid creates an infinite canvas where users can explore artworks similar to a focal artwork. The focal artwork sits at the center (chunk 0,0) and surrounding chunks contain increasingly diverse but related artworks.

## Grid Architecture

### Chunk Coordinate System
```
... | (-1,1) | (0,1)  | (1,1)  | ...
... | (-1,0) | (0,0)  | (1,0)  | ...  
... | (-1,-1)| (0,-1) | (1,-1) | ...
```

- **Focal Chunk (0,0)**: Contains the user's selected artwork
- **Ring 1 Chunks**: 8 chunks immediately surrounding focal (highly similar)
- **Ring 2+ Chunks**: Further rings with increasing diversity

### User Flow
1. User clicks artwork in main grid → opens similarity view
2. Focal artwork appears at center (0,0)  
3. User pans around to explore similar artworks
4. Each chunk loads 20 related artworks on-demand
5. User can click any artwork to make it the new focal point

---

## Current Problem: Duplicate Images

### What's Happening
- Multiple chunks return the same artworks
- Example: Both `chunkX=-1,chunkY=1` and `chunkX=-1,chunkY=-1` return artwork ID 12345
- This defeats the purpose of exploration

### Why It's a Problem
- Users see the same artwork multiple times in different areas
- Grid feels repetitive and broken
- Wastes space that could show more diverse artworks

---

## Required Solution: Global Deduplication

The field-chunk API needs to ensure **no artwork appears in multiple chunks** for the same focal artwork.

### How Frontend Calls the API

#### First Chunk Request (no exclusions)
```http
GET /api/artworks/field-chunk?targetId=2290&chunkX=-1&chunkY=1&count=20
```

**Response:** Returns 20 artworks (IDs: 100, 101, 102, ..., 119)

#### Second Chunk Request (with exclusions)
```http  
GET /api/artworks/field-chunk?targetId=2290&chunkX=-1&chunkY=-1&count=20&exclude=100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119
```

**Expected Response:** Returns 20 **completely different** artworks (IDs: 200, 201, 202, ..., 219)

#### Third Chunk Request (more exclusions)
```http
GET /api/artworks/field-chunk?targetId=2290&chunkX=0&chunkY=1&count=20&exclude=100,101,102,...,119,200,201,202,...,219
```

**Expected Response:** Returns 20 artworks that don't include any of the 40 previously excluded IDs

### Key Requirements for Backend

1. **Respect the `exclude` parameter completely**
   - If 500 IDs are in the exclude list, none of those 500 should appear in results
   - Even if they would normally be the "most similar" artworks

2. **Still maintain similarity ranking** 
   - From the remaining pool (after exclusions), return the most similar/appropriate artworks
   - Don't just return random artworks

3. **Handle large exclude lists gracefully**
   - Lists can grow to hundreds or thousands of IDs as user explores
   - Performance should remain acceptable

4. **Fallback behavior when pools are exhausted**
   - If not enough similar artworks remain after exclusions, fill with less similar ones
   - Always try to return the requested count (20 items)

---

## API Contract Verification

To test if the API is working correctly, backend dev should verify:

### Test Case 1: Basic Deduplication
```bash
# Request 1
curl "localhost:8080/api/artworks/field-chunk?targetId=2290&chunkX=0&chunkY=1&count=5"

# Expected: Returns 5 artworks, e.g., [100, 101, 102, 103, 104]

# Request 2  
curl "localhost:8080/api/artworks/field-chunk?targetId=2290&chunkX=1&chunkY=0&count=5&exclude=100,101,102,103,104"

# Expected: Returns 5 DIFFERENT artworks, e.g., [200, 201, 202, 203, 204] 
# NONE of [100, 101, 102, 103, 104] should appear in second response
```

### Test Case 2: Large Exclusion List
```bash
curl "localhost:8080/api/artworks/field-chunk?targetId=2290&chunkX=5&chunkY=5&count=20&exclude=100,101,102,103,..." 
# (include 200+ IDs in exclude list)

# Expected: Returns 20 artworks, none matching the exclude list
# Should still be reasonably similar to target despite large exclusion
```

### Test Case 3: Exclusion List Larger Than Similar Pool
```bash  
# Exclude so many similar artworks that API must fallback to less similar ones
curl "localhost:8080/api/artworks/field-chunk?targetId=2290&chunkX=10&chunkY=10&count=20&exclude=..." 
# (exclude 1000+ IDs)

# Expected: Returns 20 artworks (may be less similar but still excluded-compliant)
# Should gracefully handle case where similarity pool is exhausted
```

---

## Implementation Suggestions for Backend

### Current Field-Chunk Algorithm (Simplified)
1. Get similar artworks to targetId
2. Apply directional bias based on chunkX, chunkY  
3. Return top 20 results

### Required Modification
1. Get similar artworks to targetId
2. **Filter out any artwork IDs in the `exclude` parameter**
3. Apply directional bias based on chunkX, chunkY
4. Return top 20 from remaining pool
5. **If less than 20 remain, fill with next-best available artworks (still respecting exclude list)**

### Pseudo-code
```typescript
async function fetchFieldChunk(targetId, chunkX, chunkY, count, excludeIds = []) {
  // Get larger pool to account for exclusions
  const poolSize = Math.max(count * 3, excludeIds.length + count);
  const similarArtworks = await getSimilarArtworks(targetId, poolSize);
  
  // Apply exclusion filter FIRST
  const availableArtworks = similarArtworks.filter(artwork => 
    !excludeIds.includes(artwork.id)
  );
  
  // Apply directional bias and other field logic
  const biasedArtworks = applyDirectionalBias(availableArtworks, chunkX, chunkY);
  
  // Return requested count
  return biasedArtworks.slice(0, count);
}
```

---

## Success Criteria

✅ **No duplicate artworks across chunks** for same focal artwork  
✅ **Maintains similarity quality** despite exclusions  
✅ **Handles large exclude lists** (500+ IDs) efficiently  
✅ **Graceful degradation** when similarity pools are exhausted  
✅ **Performance** remains under 200ms even with large exclude lists  

---

## Frontend Implementation Details

The frontend similarity grid:
- Tracks all previously fetched artwork IDs in `usedArtworkIds` set
- Passes this as `excludeIds` parameter to each new chunk request
- Resets deduplication when focal artwork changes
- Expects API to honor exclusions completely

### Example Frontend Request Sequence
```typescript
// User opens similarity view for artwork 2290
// Chunk (0,0): Shows focal artwork (frontend-handled)

// Chunk (-1,1): First API call  
await fetchFieldChunk({ targetId: 2290, chunkX: -1, chunkY: 1, excludeIds: [2290] })
// → Returns IDs [100,101,102,...,119], adds them to usedArtworkIds

// Chunk (-1,-1): Second API call
await fetchFieldChunk({ targetId: 2290, chunkX: -1, chunkY: -1, excludeIds: [2290,100,101,...,119] })  
// → Should return completely different IDs [200,201,202,...,219]

// Chunk (1,1): Third API call
await fetchFieldChunk({ targetId: 2290, chunkX: 1, chunkY: 1, excludeIds: [2290,100,101,...,119,200,201,...,219] })
// → Should return yet another set of different IDs
```

---

## Questions for Backend Dev

1. **Is the `exclude` parameter currently being honored?** Check if any excluded IDs appear in results
2. **How large can the exclude list be** before performance degrades significantly? 
3. **What happens when exclude list is larger than similarity pool?** Does it gracefully fallback?
4. **Are there any caching mechanisms** that might ignore the exclude parameter?

Please test with the verification cases above and let us know the results!