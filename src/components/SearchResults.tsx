"use client"

import type { SearchResultItem } from "@/types/api"

interface SearchResultsProps {
  results: SearchResultItem[]
  query: string
  onArtworkClick: (artwork: SearchResultItem) => void
  onClose: () => void
}

export function SearchResults({ results, query, onArtworkClick, onClose }: SearchResultsProps) {
  return (
    <div className="fixed inset-0 z-30 bg-black/95 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-12 sm:px-6 sm:pt-24">
        <div className="flex items-center justify-between mb-8">
          <p className="text-white/60 text-sm">
            {results.length} results for &ldquo;{query}&rdquo;
          </p>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Back to grid
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.length === 0 && (
            <p className="col-span-full py-24 text-center text-white/60">
              No matching artworks found.
            </p>
          )}
          {results.map((artwork) => (
            <button
              key={artwork.id}
              onClick={() => onArtworkClick(artwork)}
              className="group text-left"
            >
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-white/5 mb-2">
                {artwork.imageUrl ? (
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title ?? "Artwork"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">
                    No image
                  </div>
                )}
              </div>
              <p className="text-white text-sm font-medium line-clamp-2 leading-tight">
                {artwork.title ?? "Untitled"}
              </p>
              {artwork.artist && (
                <p className="text-white/50 text-xs mt-0.5 line-clamp-1">
                  {artwork.artist}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
