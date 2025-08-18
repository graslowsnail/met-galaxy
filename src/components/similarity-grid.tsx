"use client"

import React from 'react'
import { useSimilarArtworks } from '@/hooks/use-similar-artworks'
import type { SimilarArtwork } from '@/types/api'

interface SimilarityGridProps {
  artworkId: number
  onClose: () => void
}

export function SimilarityGrid({ artworkId, onClose }: SimilarityGridProps) {
  const { data, isLoading, error } = useSimilarArtworks({ artworkId })

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-lg">Finding similar artworks...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Error</div>
            <div className="text-neutral-600 mb-4">
              {error.message || 'Failed to load similar artworks'}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data?.success || !data.data.length) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-xl max-w-md">
          <div className="text-center">
            <div className="text-neutral-800 text-lg font-medium mb-2">No Similar Artworks</div>
            <div className="text-neutral-600 mb-4">
              Similarity search is not available for this artwork.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Find the original artwork and similar ones
  const originalArtwork = data.data.find(artwork => artwork.original)
  const similarArtworks = data.data.filter(artwork => !artwork.original)
    .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 flex items-start justify-center">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8">
          {/* Header */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-neutral-800 mb-1">
                  Similar Artworks
                </h2>
                {data.meta && (
                  <p className="text-neutral-600">
                    Found {data.meta.count} similar artworks to "{data.meta.targetTitle}" by {data.meta.targetArtist}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Original artwork */}
            {originalArtwork && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-neutral-800 mb-4">You clicked this artwork:</h3>
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <img
                    src={originalArtwork.imageUrl}
                    alt={originalArtwork.title}
                    className="w-32 h-32 object-cover rounded-lg shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-neutral-800 mb-1">{originalArtwork.title}</h4>
                    <p className="text-neutral-600 mb-2">{originalArtwork.artist}</p>
                    <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      Original artwork
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Similar artworks grid */}
            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-4">
                Similar artworks (sorted by similarity):
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {similarArtworks.map((artwork, index) => (
                  <SimilarArtworkCard 
                    key={artwork.id} 
                    artwork={artwork} 
                    rank={index + 1}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          {data.meta && (
            <div className="px-6 py-4 bg-neutral-50 rounded-b-xl border-t border-neutral-200">
              <div className="flex items-center justify-between text-sm text-neutral-600">
                <span>Response time: {data.meta.responseTime}</span>
                <span>Powered by CLIP visual similarity</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface SimilarArtworkCardProps {
  artwork: SimilarArtwork
  rank: number
}

function SimilarArtworkCard({ artwork, rank }: SimilarArtworkCardProps) {
  return (
    <div className="group relative">
      {/* Rank badge */}
      <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
        #{rank}
      </div>
      
      {/* Similarity percentage */}
      <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
        {Math.round(artwork.similarity * 100)}%
      </div>

      {/* Image container */}
      <div className="aspect-square bg-neutral-200 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            // Show error placeholder
            const parent = target.parentElement
            if (parent && !parent.querySelector('.error-placeholder')) {
              const errorDiv = document.createElement('div')
              errorDiv.className = 'error-placeholder flex items-center justify-center w-full h-full bg-neutral-100 text-neutral-400 text-sm'
              errorDiv.textContent = 'Image unavailable'
              parent.appendChild(errorDiv)
            }
          }}
        />
      </div>

      {/* Metadata overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b-lg">
        <div className="p-3 text-white">
          <div className="font-medium text-sm truncate" title={artwork.title}>
            {artwork.title}
          </div>
          <div className="text-white/80 text-xs truncate" title={artwork.artist}>
            {artwork.artist}
          </div>
        </div>
      </div>
    </div>
  )
}
