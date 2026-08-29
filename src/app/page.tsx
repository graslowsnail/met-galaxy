"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import { SimilarityField } from "@/components/similarity-field"
import NavigationOverlay, { type NavigationHistoryItem } from "@/components/similarity-field/NavigationOverlay"
import { FractalWidget } from "@/components/FractalWidget"
import { WidgetContainer } from "@/components/WidgetContainer"
import type { ImageItem } from "@/components/grid-legacy/grid/types/grid"
import { apiClient } from "@/lib/api-client"
import type { SearchResultItem } from "@/types/api"

export default function Home() {
  const [similarityMode, setSimilarityMode] = useState<{
    active: boolean;
    artworkId: number | null;
    artworkData: {
      id: number;
      title: string | null;
      artist: string | null;
      date?: string | null;
      department?: string | null;
      creditLine?: string | null;
      description?: string | null;
      imageUrl: string | null;
      originalImageUrl: string | null;
      objectUrl?: string | null;
    } | null;
  }>({ active: false, artworkId: null, artworkData: null })

  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryItem[]>([])

  const [searchState, setSearchState] = useState<{
    results: SearchResultItem[] | null;
    query: string;
    nextCursor: string | null;
    hasMore: boolean;
    isLoadingMore: boolean;
  }>({
    results: null,
    query: "",
    nextCursor: null,
    hasMore: false,
    isLoadingMore: false,
  })
  const searchPageAbortRef = useRef<AbortController | null>(null)
  const searchPageLoadingRef = useRef(false)

  const handleSearchResults = useCallback((
    results: SearchResultItem[],
    query: string,
    nextCursor: string | null,
    hasMore: boolean
  ) => {
    searchPageAbortRef.current?.abort()
    searchPageAbortRef.current = null
    searchPageLoadingRef.current = false
    setSearchState({
      results,
      query,
      nextCursor,
      hasMore,
      isLoadingMore: false,
    })
    setSimilarityMode({ active: false, artworkId: null, artworkData: null })
    setNavigationHistory([])
  }, [])

  const handleClearSearch = useCallback(() => {
    searchPageAbortRef.current?.abort()
    searchPageAbortRef.current = null
    searchPageLoadingRef.current = false
    setSearchState({
      results: null,
      query: "",
      nextCursor: null,
      hasMore: false,
      isLoadingMore: false,
    })
  }, [])

  const handleLoadMoreSearchResults = useCallback(async () => {
    if (
      searchPageLoadingRef.current
      || !searchState.results
      || !searchState.hasMore
      || !searchState.nextCursor
    ) {
      return
    }

    const query = searchState.query
    const cursor = searchState.nextCursor
    const controller = new AbortController()
    searchPageAbortRef.current?.abort()
    searchPageAbortRef.current = controller
    searchPageLoadingRef.current = true
    setSearchState((current) => (
      current.query === query
        ? { ...current, isLoadingMore: true }
        : current
    ))

    try {
      const response = await apiClient.searchArtworks({
        q: query,
        cursor,
        signal: controller.signal,
      })

      setSearchState((current) => {
        if (current.query !== query || !current.results) {
          return current
        }

        const existingIds = new Set(current.results.map((artwork) => artwork.id))
        const newResults = response.data.filter(
          (artwork) => !existingIds.has(artwork.id)
        )

        return {
          results: [...current.results, ...newResults],
          query,
          nextCursor: response.meta.nextCursor,
          hasMore: response.meta.hasMore,
          isLoadingMore: true,
        }
      })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Failed to load more search results:", error)
        setSearchState((current) => (
          current.query === query
            ? {
                ...current,
                nextCursor: null,
                hasMore: false,
              }
            : current
        ))
      }
    } finally {
      if (searchPageAbortRef.current === controller) {
        searchPageAbortRef.current = null
        searchPageLoadingRef.current = false
        setSearchState((current) => (
          current.query === query
            ? { ...current, isLoadingMore: false }
            : current
        ))
      }
    }
  }, [searchState])

  useEffect(() => {
    return () => searchPageAbortRef.current?.abort()
  }, [])

  // Handle artwork click from main grid
  const handleArtworkClick = useCallback((image: ImageItem) => {
    if (image.databaseId) {
      searchPageAbortRef.current?.abort()
      searchPageAbortRef.current = null
      searchPageLoadingRef.current = false
      setSearchState({
        results: null,
        query: "",
        nextCursor: null,
        hasMore: false,
        isLoadingMore: false,
      })

      const artworkData = {
        id: image.databaseId,
        title: image.title ?? null,
        artist: image.artist ?? null,
        date: image.date ?? null,
        department: image.department ?? null,
        creditLine: image.creditLine ?? null,
        description: image.description ?? null,
        imageUrl: image.src,
        originalImageUrl: image.originalImageUrl ?? image.src,
        objectUrl: (image as any).objectUrl ?? null
      }

      setSimilarityMode({
        active: true,
        artworkId: image.databaseId,
        artworkData
      })

      setNavigationHistory([
        {
          id: 'main-grid',
          title: 'Main Grid',
          artist: null,
          thumbnailUrl: null,
          isMainGrid: true
        },
        {
          id: image.databaseId,
          title: image.title ?? null,
          artist: image.artist ?? null,
          thumbnailUrl: image.src
        }
      ])
    } else {
      alert('Similar artwork exploration requires database ID')
    }
  }, [])

  const handleSimilarityArtworkClick = useCallback((artwork: {
    id: number
    title: string | null
    artist: string | null
    imageUrl: string | null
  }) => {
    const artworkData = {
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      imageUrl: artwork.imageUrl,
      originalImageUrl: artwork.imageUrl ?? null,
      objectUrl: (artwork as any).objectUrl ?? null
    }

    setSimilarityMode({
      active: true,
      artworkId: artwork.id,
      artworkData
    })

    setNavigationHistory(prev => [
      ...prev,
      {
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist,
        thumbnailUrl: artwork.imageUrl
      }
    ])
  }, [])

  const handleCloseSimilarity = useCallback(() => {
    setSimilarityMode({ active: false, artworkId: null, artworkData: null })
    setNavigationHistory([])
  }, [])

  const handleNavigateToHistoryItem = useCallback((item: NavigationHistoryItem, index: number) => {
    if (item.isMainGrid) {
      handleCloseSimilarity()
      return
    }

    const artworkData = {
      id: item.id as number,
      title: item.title,
      artist: item.artist,
      imageUrl: item.thumbnailUrl,
      originalImageUrl: item.thumbnailUrl ?? null,
      objectUrl: (item as any).objectUrl ?? null
    }

    setSimilarityMode({
      active: true,
      artworkId: item.id as number,
      artworkData
    })

    setNavigationHistory(prev => prev.slice(0, index + 1))
  }, [handleCloseSimilarity])

  return (
    <>
      {/* Widgets (search, info) */}
      <WidgetContainer
        onSearchResults={handleSearchResults}
        onClearSearch={handleClearSearch}
      />

      {/* Main and search result grid */}
      {!similarityMode.active && (
        <DraggableImageGrid
          key={searchState.results
            ? `search-${searchState.query}`
            : 'main-grid'}
          onArtworkClick={handleArtworkClick}
          artworks={searchState.results ?? undefined}
          hasMoreArtworks={searchState.hasMore}
          isLoadingMoreArtworks={searchState.isLoadingMore}
          onLoadMoreArtworks={handleLoadMoreSearchResults}
          showPerformanceOverlay={false}
          showLoadingIndicators={true}
        />
      )}

      {/* Similarity exploration mode */}
      {similarityMode.active && similarityMode.artworkId && similarityMode.artworkData && (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
          <SimilarityField
            key={`similarity-${similarityMode.artworkId}`}
            focalArtworkId={similarityMode.artworkId}
            focalArtwork={similarityMode.artworkData}
            onArtworkClick={handleSimilarityArtworkClick}
          />
          <NavigationOverlay
            navigationHistory={navigationHistory}
            currentFocalId={similarityMode.artworkId ?? 'main-grid'}
            onNavigateToHistoryItem={handleNavigateToHistoryItem}
            isVisible={true}
          />
        </div>
      )}

      <div className={similarityMode.active ? "hidden sm:block" : "block"}>
        <FractalWidget />
      </div>
    </>
  );
}
