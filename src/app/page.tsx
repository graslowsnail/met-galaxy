"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { DraggableImageGrid } from "@/components/draggable-image-grid"
import { SimilarityField } from "@/components/similarity-field"
import NavigationOverlay, { type NavigationHistoryItem } from "@/components/similarity-field/NavigationOverlay"
import { FractalWidget } from "@/components/FractalWidget"
import { WidgetContainer } from "@/components/WidgetContainer"
import type { ImageItem } from "@/components/grid-legacy/grid/types/grid"
import { apiClient } from "@/lib/api-client"
import { getVoterId } from "@/lib/likes"
import type { MostLikedArtwork, SearchResultItem } from "@/types/api"

const updatePathUrl = (artworkIds: number[], mode: 'push' | 'replace' = 'push') => {
  const url = new URL(window.location.href)
  url.searchParams.delete('artwork')
  if (artworkIds.length > 0) {
    url.searchParams.set('path', artworkIds.join(','))
  } else {
    url.searchParams.delete('path')
  }
  if (url.toString() === window.location.href) return
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url)
}

const readPathFromUrl = () => {
  const url = new URL(window.location.href)
  const value = url.searchParams.get('path') ?? url.searchParams.get('artwork')
  if (!value) return []

  const ids = value.split(',').map(Number)
  if (
    ids.length > 100
    || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  ) {
    return null
  }
  return ids
}

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
  const sharedArtworkRequestRef = useRef<AbortController | null>(null)
  const shareStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')
  const [likeState, setLikeState] = useState({ liked: false, likeCount: 0 })
  const [isLikeLoading, setIsLikeLoading] = useState(false)

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
    updatePathUrl([])
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
      updatePathUrl([image.databaseId])

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

  const handleMostLikedArtworkClick = useCallback((artwork: MostLikedArtwork) => {
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
    setSimilarityMode({
      active: true,
      artworkId: artwork.id,
      artworkData: {
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist,
        date: artwork.date,
        department: artwork.department,
        creditLine: artwork.creditLine,
        description: artwork.description,
        imageUrl: artwork.imageUrl,
        originalImageUrl: artwork.originalImageUrl,
        objectUrl: artwork.objectUrl,
      },
    })
    setNavigationHistory([
      {
        id: 'main-grid',
        title: 'Main Grid',
        artist: null,
        thumbnailUrl: null,
        isMainGrid: true,
      },
      {
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist,
        thumbnailUrl: artwork.imageUrl,
      },
    ])
    updatePathUrl([artwork.id])
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
    const nextHistory = [
      ...navigationHistory,
      {
        id: artwork.id,
        title: artwork.title,
        artist: artwork.artist,
        thumbnailUrl: artwork.imageUrl
      }
    ]
    setNavigationHistory(nextHistory)
    updatePathUrl(nextHistory.flatMap((item) => (
      typeof item.id === 'number' ? [item.id] : []
    )))
  }, [navigationHistory])

  const handleCloseSimilarity = useCallback(() => {
    setSimilarityMode({ active: false, artworkId: null, artworkData: null })
    setNavigationHistory([])
    updatePathUrl([])
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
    const nextHistory = navigationHistory.slice(0, index + 1)
    setNavigationHistory(nextHistory)
    updatePathUrl(nextHistory.flatMap((historyItem) => (
      typeof historyItem.id === 'number' ? [historyItem.id] : []
    )))
  }, [handleCloseSimilarity, navigationHistory])

  useEffect(() => {
    const openArtworkFromUrl = async () => {
      const pathIds = readPathFromUrl()
      sharedArtworkRequestRef.current?.abort()
      if (pathIds?.length === 0) {
        setSimilarityMode({ active: false, artworkId: null, artworkData: null })
        setNavigationHistory([])
        return
      }

      if (!pathIds) {
        setSimilarityMode({ active: false, artworkId: null, artworkData: null })
        setNavigationHistory([])
        updatePathUrl([], 'replace')
        return
      }

      const controller = new AbortController()
      sharedArtworkRequestRef.current = controller

      try {
        const { data: pathArtworks } = await apiClient.getArtworks(pathIds, controller.signal)
        if (controller.signal.aborted) return
        const artwork = pathArtworks.at(-1)
        if (!artwork) return

        setSearchState({
          results: null,
          query: "",
          nextCursor: null,
          hasMore: false,
          isLoadingMore: false,
        })
        setSimilarityMode({
          active: true,
          artworkId: artwork.id,
          artworkData: {
            id: artwork.id,
            title: artwork.title,
            artist: artwork.artist,
            date: artwork.date,
            department: artwork.department,
            creditLine: artwork.creditLine,
            description: artwork.description,
            imageUrl: artwork.imageUrl,
            originalImageUrl: artwork.originalImageUrl,
            objectUrl: artwork.objectUrl,
          },
        })
        setNavigationHistory([
          {
            id: 'main-grid',
            title: 'Main Grid',
            artist: null,
            thumbnailUrl: null,
            isMainGrid: true,
          },
          ...pathArtworks.map((pathArtwork) => ({
            id: pathArtwork.id,
            title: pathArtwork.title,
            artist: pathArtwork.artist,
            thumbnailUrl: pathArtwork.imageUrl,
          })),
        ])
        updatePathUrl(pathIds, 'replace')
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to open shared artwork path:', error)
          updatePathUrl([], 'replace')
        }
      }
    }

    void openArtworkFromUrl()
    window.addEventListener('popstate', openArtworkFromUrl)
    return () => {
      window.removeEventListener('popstate', openArtworkFromUrl)
      sharedArtworkRequestRef.current?.abort()
    }
  }, [])

  useEffect(() => () => {
    if (shareStatusTimerRef.current) clearTimeout(shareStatusTimerRef.current)
  }, [])

  useEffect(() => {
    const artworkId = similarityMode.artworkId
    if (!artworkId) {
      setLikeState({ liked: false, likeCount: 0 })
      return
    }

    const controller = new AbortController()
    setIsLikeLoading(true)
    void apiClient.getArtworkLikeState(artworkId, getVoterId(), controller.signal)
      .then((response) => setLikeState(response.data))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load artwork like status:', error)
          setLikeState({ liked: false, likeCount: 0 })
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLikeLoading(false)
      })

    return () => controller.abort()
  }, [similarityMode.artworkId])

  const handleToggleLike = useCallback(async () => {
    const artworkId = similarityMode.artworkId
    if (!artworkId || isLikeLoading) return

    setIsLikeLoading(true)
    try {
      const response = await apiClient.setArtworkLiked(
        artworkId,
        getVoterId(),
        !likeState.liked,
      )
      setLikeState(response.data)
    } catch (error) {
      console.error('Failed to update artwork like:', error)
    } finally {
      setIsLikeLoading(false)
    }
  }, [isLikeLoading, likeState.liked, similarityMode.artworkId])

  const handleSharePath = useCallback(async () => {
    const artwork = similarityMode.artworkData
    if (!artwork) return

    const pathIds = navigationHistory.flatMap((item) => (
      typeof item.id === 'number' ? [item.id] : []
    ))
    const url = new URL(window.location.href)
    url.searchParams.delete('artwork')
    url.searchParams.set('path', pathIds.join(','))

    try {
      await navigator.clipboard.writeText(url.toString())
      setShareStatus('copied')
      if (shareStatusTimerRef.current) clearTimeout(shareStatusTimerRef.current)
      shareStatusTimerRef.current = setTimeout(() => setShareStatus('idle'), 2000)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Failed to share artwork:', error)
      }
    }
  }, [navigationHistory, similarityMode.artworkData])

  return (
    <>
      {/* Widgets (search, info) */}
      <WidgetContainer
        onSearchResults={handleSearchResults}
        onClearSearch={handleClearSearch}
        onMostLikedArtworkClick={handleMostLikedArtworkClick}
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
            onSharePath={handleSharePath}
            shareStatus={shareStatus}
            liked={likeState.liked}
            likeCount={likeState.likeCount}
            isLikeLoading={isLikeLoading}
            onToggleLike={handleToggleLike}
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
