"use client"

import { InfoWidget } from "./InfoWidget"
import { SearchWidget } from "./SearchWidget"
import type { SearchResultItem } from "@/types/api"

interface WidgetContainerProps {
  onSearchResults: (
    results: SearchResultItem[],
    query: string,
    nextCursor: string | null,
    hasMore: boolean
  ) => void
  onClearSearch: () => void
}

export function WidgetContainer({ onSearchResults, onClearSearch }: WidgetContainerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 sm:top-6 sm:left-6 sm:right-6 grid grid-cols-2 sm:grid-cols-3 items-center z-40 pointer-events-none rounded-none sm:rounded-lg p-2">
      <div className="pointer-events-auto">
        <InfoWidget />
      </div>
      <div className="pointer-events-auto col-start-2 justify-self-end sm:col-start-2 sm:justify-self-center">
        <SearchWidget onSearchResults={onSearchResults} onClearSearch={onClearSearch} />
      </div>
      <div className="hidden sm:block"></div>
    </div>
  )
}
