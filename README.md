# Met Galaxy - Frontend

A Next.js frontend application for browsing and exploring artwork in an infinite grid layout.

## Features

- Infinite draggable grid layout
- Virtual scrolling for performance
- Responsive design
- Artwork metadata display
- Fallback placeholder images

## Tech Stack

- [Next.js 15](https://nextjs.org) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) - HTTP requests

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Backend API running (see API_SPEC.md for endpoint requirements)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Create a `.env.local` file:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   bun run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Integration

This frontend expects a REST API backend. See `API_SPEC.md` for the complete API specification.

### Required Endpoints

- `GET /api/artworks/random` - Get random artworks
- `GET /api/artworks/chunk` - Get artworks for specific grid chunk
- `GET /api/artworks/count` - Get total artwork count

## Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
└── config/             # Configuration files
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

## Deployment

This is a standard Next.js application that can be deployed to:

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- Any platform supporting Next.js

Make sure to set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend API.
