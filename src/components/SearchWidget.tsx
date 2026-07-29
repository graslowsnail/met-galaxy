"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Check, X, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { SearchResultItem } from "@/types/api"

interface SearchWidgetProps {
  onSearchResults: (
    results: SearchResultItem[],
    query: string,
    nextCursor: string | null,
    hasMore: boolean
  ) => void
  onClearSearch: () => void
}

export function SearchWidget({ onSearchResults, onClearSearch }: SearchWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleToggle = () => {
    if (isExpanded) {
      handleCollapse()
    } else {
      setIsExpanded(true)
      setIsClosing(false)
    }
  }

  const handleCollapse = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsExpanded(false)
      setIsClosing(false)
    }, 400)
  }

  const handleSubmit = async () => {
    const query = searchValue.trim()
    if (!query || query.length < 2) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.searchArtworks({
        q: query,
        signal: controller.signal,
      })
      setHasSearched(true)
      onSearchResults(
        response.data,
        query,
        response.meta.nextCursor,
        response.meta.hasMore
      )
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      setError("Search failed. Try again.")
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsLoading(false)
      }
    }
  }

  const handleClear = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setSearchValue("")
    setHasSearched(false)
    setIsLoading(false)
    setError(null)
    onClearSearch()
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    let dragStarted = false

    const handleMouseDown = () => {
      dragStarted = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons === 1 && !dragStarted) {
        dragStarted = true
        if (isExpanded) {
          handleCollapse()
        }
      }
    }

    const handleMouseUp = () => {
      dragStarted = false
    }

    const handleTouchStart = () => {
      dragStarted = false
    }

    const handleTouchMove = () => {
      if (!dragStarted) {
        dragStarted = true
        if (isExpanded) {
          handleCollapse()
        }
      }
    }

    const handleTouchEnd = () => {
      dragStarted = false
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isExpanded])

  return (
    <>
      <style jsx>{`
        @keyframes expandBubble {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes collapseBubble {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.3);
            opacity: 0;
          }
        }
      `}</style>

      <div className="relative">
        <div className="relative">
          {!isExpanded && (
            <div className="relative">
              <div
                className="absolute top-0 left-0 w-full h-full rounded-full opacity-40 blur-[8px] scale-110"
                style={{
                  background: "linear-gradient(270deg, rgb(85, 254, 254) 0%, rgb(191, 73, 238) 100%)",
                }}
              ></div>

              <button
                onClick={handleToggle}
                aria-label="Open artwork search"
                className="relative bg-white/85 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 w-12 h-12 sm:w-14 sm:h-14"
              >
                <Search className="w-6 h-6 text-slate-900" />
              </button>
            </div>
          )}

          {isExpanded && (
            <div
              className="fixed top-16 left-4 right-4 z-50 rounded-full px-6 py-4 bg-white/85 backdrop-blur-sm shadow-lg border border-white/20 sm:static sm:z-auto sm:w-[28rem] sm:px-8 sm:py-4"
              style={{
                animation: isClosing
                  ? 'collapseBubble 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                  : 'expandBubble 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                transformOrigin: 'center'
              }}
            >
              <div className="flex items-center space-x-3">
                <Search className="w-5 h-5 text-slate-900 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value)
                    setHasSearched(false)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleSubmit()
                    }
                  }}
                  aria-label="Search artworks"
                  placeholder="Search artworks..."
                  className="bg-transparent outline-none text-slate-900 placeholder-slate-600 flex-1"
                  disabled={isLoading}
                />
                {isLoading && (
                  <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                )}
                {!isLoading && searchValue && (
                  <button
                    onClick={hasSearched ? handleClear : () => void handleSubmit()}
                    aria-label={hasSearched ? "Clear artwork search" : "Submit artwork search"}
                    className="text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {hasSearched ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-1 pl-8">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
