"use client"

import { useEffect, useState } from "react"
import { Heart, Loader2, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { getVoterId } from "@/lib/likes"
import type { MostLikedArtwork, TimelineRange } from "@/types/api"

interface MostLikedWidgetProps {
  onArtworkClick: (artwork: MostLikedArtwork) => void
  timelineRange: TimelineRange | null
}

export function MostLikedWidget({ onArtworkClick, timelineRange }: MostLikedWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [artworks, setArtworks] = useState<MostLikedArtwork[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    void apiClient.getMostLikedArtworks(getVoterId(), 24, controller.signal, timelineRange)
      .then((response) => setArtworks(response.data))
      .catch((requestError) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError('Could not load the Hall of Fame.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [isOpen, timelineRange])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Hall of Fame"
        title="Hall of Fame"
        className="relative flex h-[30px] items-center justify-center gap-1.5 rounded-[12px] border border-white/40 bg-white/55 px-3 text-xs font-medium text-[#3c3931] shadow-sm backdrop-blur-[12px] transition-colors hover:bg-white/75"
      >
        <Heart size={15} className="text-[#e11d48]" fill="currentColor" />
        <span>Hall of Fame</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <section
            className="relative w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/95 p-5 sm:p-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Hall of Fame"
              className="absolute top-5 right-5 text-gray-500 hover:text-gray-800"
            >
              <X size={24} />
            </button>

            <div className="mb-6 pr-10">
              <h2 className="font-serif text-3xl font-bold text-gray-900">Hall of Fame</h2>
              <p className="mt-1 text-sm text-gray-500">The collection favorites chosen by visitors.</p>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="mr-2 animate-spin" size={20} />
                Loading favorites…
              </div>
            )}

            {!isLoading && error && (
              <p className="py-16 text-center text-sm text-red-600">{error}</p>
            )}

            {!isLoading && !error && artworks.length === 0 && (
              <div className="py-16 text-center">
                <Heart className="mx-auto mb-3 text-gray-300" size={36} />
                <p className="text-gray-600">
                  {timelineRange ? 'No likes in this period yet.' : 'No likes yet. Be the first to choose a favorite.'}
                </p>
              </div>
            )}

            {!isLoading && !error && artworks.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {artworks.map((artwork, index) => (
                  <button
                    type="button"
                    key={artwork.id}
                    onClick={() => {
                      setIsOpen(false)
                      onArtworkClick(artwork)
                    }}
                    className="group overflow-hidden rounded-xl bg-gray-100 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-200">
                      {artwork.imageUrl && (
                        <img
                          src={artwork.imageUrl}
                          alt={artwork.title ?? 'Artwork'}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      )}
                      <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white">
                        #{index + 1}
                      </span>
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-rose-600">
                        <Heart size={12} fill="currentColor" />
                        {artwork.likeCount}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-gray-900">{artwork.title ?? 'Untitled'}</p>
                      {artwork.artist && <p className="mt-1 truncate text-xs text-gray-500">{artwork.artist}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}
