# API Specification

## Base URL
`http://localhost:3001/api` (adjust port as needed)

## Endpoints

### GET /artworks/random
Get random artworks with images

**Query Parameters:**
- `count` (number, optional): Number of artworks to return (1-200, default: 50)
- `seed` (number, optional): Seed for deterministic randomness

**Response:**
```typescript
interface Artwork {
  id: string
  objectId: number
  title: string | null
  artist: string | null
  date: string | null
  primaryImage: string | null
  primaryImageSmall: string | null
  department: string | null
  culture: string | null
  medium: string | null
}

interface RandomArtworksResponse {
  artworks: Artwork[]
  total: number
}
```

**Example:**
```json
{
  "artworks": [
    {
      "id": "1",
      "objectId": 12345,
      "title": "Starry Night",
      "artist": "Vincent van Gogh",
      "date": "1889",
      "primaryImage": "https://example.com/large.jpg",
      "primaryImageSmall": "https://example.com/small.jpg",
      "department": "European Paintings",
      "culture": "Dutch",
      "medium": "Oil on canvas"
    }
  ],
  "total": 1
}
```

### GET /artworks/chunk
Get artworks for a specific chunk (for deterministic grid layout)

**Query Parameters:**
- `chunkX` (number, required): X coordinate of the chunk
- `chunkY` (number, required): Y coordinate of the chunk
- `count` (number, optional): Number of artworks to return (1-50, default: 20)

**Response:** Same as random artworks endpoint

### GET /artworks/count
Get total count of artworks with images

**Response:**
```typescript
interface ArtworkCountResponse {
  count: number
}
```

**Example:**
```json
{
  "count": 50000
}
```

## Error Responses

All endpoints should return consistent error responses:

```typescript
interface ErrorResponse {
  error: string
  message: string
  statusCode: number
}
```

**Example:**
```json
{
  "error": "ValidationError",
  "message": "Count must be between 1 and 200",
  "statusCode": 400
}
```

## CORS
Backend should allow CORS from frontend origin (typically `http://localhost:3000`)

## Rate Limiting
Consider implementing rate limiting for production use
