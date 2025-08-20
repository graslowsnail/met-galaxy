
# Project Spec: Infinite-Plane Masonry Grid (Column Carry‑Over)

- **One-liner:** A 2D draggable, virtualized image plane that lays out tiles with per-strip column carry-over to eliminate horizontal seams between chunks.
- **Status:** Working reference implementation (React + Next.js). Ready to integrate into the existing app.
- **Why:** Classic chunked masonry uses a fixed `CHUNK_HEIGHT`, causing visible horizontal gaps. This approach assigns **absolute world Y** to every tile by carrying column heights vertically per strip, so there are no seams.

---

## Problem & Goals

### Problems we saw
- Horizontal “black bands” between chunks due to fixed-height chunk wrappers.
- Late-arriving data for a chunk changes true height → layout shifts.
- Over-rendering during drag when layout + data concerns are mixed.

### Goals
- Seamless masonry without gaps on a large 2D canvas.
- Deterministic & fast placement of tiles independent of image decode.
- Keep infinite panning, lazy fetching, and low memory usage.
- Clean separation: **camera** (pan/zoom), **virtualization**, **data**, **layout**, **render**.

### Non-goals
- Full-featured zoom (we left hooks to add it).
- Precise SSR rendering (client-side virtualization is fine).

---

## System Overview

```
Pointer Input → usePointerPan (camera)
            → useViewportSize + useGridVirtualizer (which chunk coords are near the camera)
            → useChunkLoader (fetch chunk images; LRU cache)
            → useColumnCarryover (place tiles with absolute world Y; reflow per-strip if needed)
            → <WorldPlane> renders positioned <button><img/></button> tiles
```

**Key idea:** Treat the world as a plane. Split the X axis into vertical **strips** (each strip = `COLUMNS_PER_CHUNK` columns). For each strip we maintain four running column bottoms (carry). When any chunk for that strip arrives, we place its tiles starting from the current bottoms and update them. If an earlier chunk arrives later, we reflow the strip from that point—only that strip’s tiles move.

---

## Public API

### `<DraggableImageGrid />`
```tsx
type Props = {
  onArtworkClick?: (img: ImageItem) => void;
  initialTranslate?: { x: number; y: number }; // camera start
};
```

- **Behavior:** Full-screen, draggable world plane; lazy loads nearby chunks; renders tiles at absolute positions; prevents click during drag.

---

## Data Contracts

### `ImageItem`
```ts
interface ImageItem {
  id: string;
  src: string;
  width?: number;             // optional if aspectRatio provided
  height?: number;
  aspectRatio?: number;       // preferred; width/height fallback
  databaseId?: number;
  objectId?: number;
  title?: string;
  artist?: string;
  chunkX: number;             // chunk grid coords from API request
  chunkY: number;
  localIndex: number;         // index within chunk
}
```

> **Best practice:** Supply `aspectRatio` from the backend for stable layout before images decode.

---

## Constants (defaults)

```ts
export const COLUMN_WIDTH = 280;          // px
export const GAP = 16;                    // px
export const COLUMNS_PER_CHUNK = 4;
export const CHUNK_SIZE = 20;

export const CHUNK_WIDTH =
  COLUMNS_PER_CHUNK * COLUMN_WIDTH + (COLUMNS_PER_CHUNK - 1) * GAP;
export const CHUNK_HEIGHT = 1600;         // only used for coarse virtualization

export const VIEWPORT_BUFFER_PX = 200;    // preload around viewport
export const MAX_RENDERED_CHUNKS = 12;    // cap visible chunks
export const CLICK_MOVE_THRESHOLD = 6;    // px (drag vs click)
```

---

## Core Hooks & Responsibilities

### 1) `usePointerPan`
- **State:** `{ translate: {x,y}, isDragging }`
- **Handlers:** `onPointerDown|Move|Up` with RAF-throttled updates.
- **Notes:** translates the **world plane** with CSS `transform`. Clicks are ignored if movement exceeds threshold.

### 2) `useViewportSize`
- Tracks `window.innerWidth/Height` with a resize listener.

### 3) `useGridVirtualizer`
- **Input:** `translate`, `viewport`.
- **Output:** `visible: Array<{x: number; y: number}>` chunk coordinates near camera, with buffer and hard cap.
- **Note:** Uses **approximate** `CHUNK_WIDTH/HEIGHT` just to decide what to fetch. Rendering does **not** depend on fixed chunk height.

### 4) `useChunkLoader`
- Deduped fetches for chunk coords via `/api/artworks/chunk?chunkX&chunkY&count`.
- Small LRU (`Map`) for recent chunk payloads.
- Returns `chunks: Map<"x:y", { id, x, y, images: ImageItem[] }>`.

### 5) `useColumnCarryover` **(new)**
- **State:**
  - `originalsByKey: Map<key, ImageItem[]>` – raw images for reflow.
  - `keysByX: Map<x, number[]>` – sorted list of `y` per strip.
  - `placedByKey: Map<key, PositionedImage[]>` – world-placed tiles.
- **API:**
  - `upsertChunk(x, y, images)` → place/reflow strip **x**, store placed tiles.
  - `getPlaced(x, y)` → previously placed tiles (if any).
  - `reflowStrip(x)` → recompute a strip from top to bottom.
  - `pruneTo(Set<key>)` → drop non-visible chunks and reflow remaining strips.
  - `snapshotPlaced()` → flatten all placed tiles (debugging/tools).
- **Algorithm:**
  - Maintain per-strip **column bottoms**: `[h0,h1,h2,h3]`.
  - When a chunk `(x,y)` arrives: insert `y` into `keysByX[x]`, reflow strip `x` from the beginning:
    - Start bottoms at `[0,0,0,0]`.
    - For each `y` ascending:
      - For each image in that chunk:
        - `col = argmin(bottoms)`
        - `worldX = x * CHUNK_WIDTH + col*(COLUMN_WIDTH+GAP)`
        - `worldY = bottoms[col]`
        - `height = round(COLUMN_WIDTH / aspect)`
        - `bottoms[col] += height + GAP`
- **Why full reflow per strip?**
  - Simpler & correct. Strips are short (only the currently visible few chunks), so it’s cheap.
  - Guarantees consistency if earlier chunks arrive later or images differ.

---

## Rendering Pipeline

1. Virtualizer yields visible chunk coords (`{x,y}` near camera).
2. ChunkLoader returns data as they arrive.
3. For each visible `{x,y}`:
   - If data present → `upsertChunk(x,y,images)` (places & reflows strip).
   - Else → `getPlaced(x,y)` (may already have tiles from earlier).
4. Collect all **PositionedImage** tiles and render them as absolutely positioned `<button>` elements inside the world plane (`transform: translate(-cameraX, -cameraY)`).
5. Click is ignored if we dragged during the pointer interaction.

**No vertical chunk wrappers are needed.** Tiles are placed directly at world coordinates → no horizontal seams.

---

## Integration Steps (with your existing app)

1. **Copy Files**
   - `constants.ts`, `types.ts`, `hooks/useViewportSize.ts`, `hooks/usePointerPan.ts`
   - `hooks/useGridVirtualizer.ts`, `hooks/useChunkLoader.ts`
   - `hooks/useColumnCarryover.ts` (the new one)
   - `DraggableImageGrid.tsx` (Option‑2 version)

2. **Wire API Client**
   - Ensure `/api/artworks/chunk` returns image records containing `id`, `primaryImage` (or small), and **preferably `aspectRatio`** (float). If not, include `width` & `height`.

3. **Component Usage**
   ```tsx
   <DraggableImageGrid
     onArtworkClick={(img) => openSimilarity(img.databaseId)}
     initialTranslate={{ x: 0, y: 0 }}
   />
   ```

4. **Styling**
   - World plane container is `position:absolute; will-change: transform;`.
   - Buttons use `position:absolute` with `left/top/width/height` set from layout.

5. **Virtualization Buffer**
   - Tune `VIEWPORT_BUFFER_PX` (start with `200–300`) and `MAX_RENDERED_CHUNKS` to match device perf.

6. **Caching**
   - `useChunkLoader` LRU size: start at `100`; increase if memory allows.
   - (Optional) Persist placed tiles per strip if you navigate away and back.

7. **Accessibility**
   - Each tile is a `<button>` with `aria-label` including title.
   - Add keyboard navigation later (arrow keys & PageUp/Down) if desired.

---

## Performance & Quality Notes

- **Aspect Ratio:** If server can provide `aspectRatio`, do it. Layout becomes deterministic without waiting for decode.
- **Integer math:** Use `Math.round()` on computed heights to avoid 1‑px drift.
- **Decode pressure:** On very fast pans, consider a simple decode queue (limit concurrent image decodes). Start with browser defaults; only optimize if you see jank.
- **Transform-only during drag:** Only the world plane’s `transform` updates during movement → minimal reflow.
- **Pruning:** `pruneTo()` keeps memory usage bounded by visible chunk keys. You can keep a 1‑ring neighbor if you want smoother back‑pans.

---

## Error Handling

- Fetch failures: log & retry/backoff; render a “retry” tile or skip silently.
- Missing image URL: render a placeholder stub (keeps column math intact).
- Bad dimensions: if `aspectRatio` is NaN/0, default to `1` (square) to protect layout.

---

## Acceptance Criteria

- No visible horizontal gaps at any scroll position.
- Dragging remains 60fps on mid-range laptop (devtools Performance).
- Late chunk arrivals do not produce permanent overlap/holes; strip reflow corrects it.
- Memory remains below chosen cap with continuous panning (validate via Chrome Memory).
- Clicking a tile after a small movement threshold still works; accidental drags don’t trigger clicks.

---

## Future Enhancements

- **Zoom:** add `scale` to camera; multiply `CHUNK_WIDTH`, `COLUMN_WIDTH`, `GAP` by `scale` in layout.
- **Keyboard nav:** arrow keys move camera by 1/2 viewport; `Enter` opens focused tile.
- **Similarity mode:** center clicked image by setting `translate` to `tile.worldCenter` and swap data source to `useSimilarArtworks`.
- **Image component:** migrate to `next/image` with `sizes` for better loading hints.

---

## Appendix: Reference Snippets

### Place a chunk
```ts
const placed = upsertChunk(x, y, images); // returns PositionedImage[] for this key
```

### Reflow after data correction
```ts
reflowStrip(x); // recompute strip after changing images for any of its chunks
```

### Prune memory to current visible set
```ts
const alive = new Set(visible.map(({x,y}) => `${x}:${y}`));
pruneTo(alive);
```

---

## Glossary

- **World plane:** The absolute positioned canvas that is translated by the camera.
- **Strip (chunkX):** A vertical slice of the world that contains `COLUMNS_PER_CHUNK` masonry columns.
- **Carry-over:** The running bottom Y of each column in a strip used to place subsequent tiles.
- **Chunk:** Server-fetch unit (x,y). We still fetch by chunks, but we render tiles directly into the world.
