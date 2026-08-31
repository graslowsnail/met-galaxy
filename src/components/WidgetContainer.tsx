"use client"

import { useState } from "react"
import { InfoWidget } from "./InfoWidget"
import { SearchWidget } from "./SearchWidget"
import { MostLikedWidget } from "./MostLikedWidget"
import type { MostLikedArtwork, SearchResultItem, TimelineRange } from "@/types/api"
import { TimelineWidget } from "./TimelineWidget"

interface WidgetContainerProps {
  onSearchResults: (
    results: SearchResultItem[],
    query: string,
    nextCursor: string | null,
    hasMore: boolean
  ) => void
  onClearSearch: () => void
  searchQuery: string
  onMostLikedArtworkClick: (artwork: MostLikedArtwork) => void
  timelineRange: TimelineRange | null
  onTimelineChange: (range: TimelineRange | null) => void
}

export function WidgetContainer({ onSearchResults, onClearSearch, searchQuery, onMostLikedArtworkClick, timelineRange, onTimelineChange }: WidgetContainerProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)

  const handleSearchOpenChange = (open: boolean) => {
    setSearchOpen(open)
    if (open) setTimelineOpen(false)
  }

  const handleTimelineOpenChange = (open: boolean) => {
    setTimelineOpen(open)
    if (open) setSearchOpen(false)
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between p-3 sm:p-6">
        <div className="pointer-events-auto"><InfoWidget /></div>
        <div className="pointer-events-auto"><MostLikedWidget onArtworkClick={onMostLikedArtworkClick} timelineRange={timelineRange} /></div>
      </div>

      <div className={`pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-opacity duration-200 ${timelineOpen ? "invisible opacity-0" : "visible opacity-100"}`}>
        <div className="pointer-events-auto flex items-center gap-2 rounded-[16px] border border-[#0f1524]/5 bg-white/95 px-3 py-2 shadow-[0_2px_6px_rgba(15,21,36,.08),0_12px_30px_-20px_rgba(15,21,36,.35)] backdrop-blur-[14px]">
          <SearchWidget onSearchResults={onSearchResults} onClearSearch={onClearSearch} timelineRange={timelineRange} open={searchOpen} onOpenChange={handleSearchOpenChange} activeQuery={searchQuery} />
          <TimelineWidget range={timelineRange} onChange={onTimelineChange} open={timelineOpen} onOpenChange={handleTimelineOpenChange} compact={searchOpen} />
        </div>
      </div>
    </>
  )
}
