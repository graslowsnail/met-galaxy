"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Loader2, Search, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { SearchResultItem, TimelineRange } from "@/types/api"

interface SearchWidgetProps {
  onSearchResults: (results: SearchResultItem[], query: string, nextCursor: string | null, hasMore: boolean) => void
  onClearSearch: () => void
  timelineRange: TimelineRange | null
  open: boolean
  onOpenChange: (open: boolean) => void
  activeQuery: string
}

export function SearchWidget({ onSearchResults, onClearSearch, timelineRange, open, onOpenChange, activeQuery }: SearchWidgetProps) {
  const [searchValue, setSearchValue] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = async () => {
    const query = searchValue.trim()
    if (query.length < 2) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.searchArtworks({ q: query, signal: controller.signal, timelineRange })
      setHasSearched(true)
      onSearchResults(response.data, query, response.meta.nextCursor, response.meta.hasMore)
      onOpenChange(false)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setError("Search failed. Try again.")
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
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!activeQuery) {
      setSearchValue("")
      setHasSearched(false)
    }
  }, [activeQuery])

  useEffect(() => () => abortRef.current?.abort(), [])

  return <div className="relative flex min-w-0 items-center">
    {open ? <div className="flex h-[30px] min-w-[min(70vw,460px)] items-center gap-2 rounded-[12px] border border-[#0f1524] bg-[#f5f3ed] px-3 sm:min-w-[420px]">
      <Search size={15} className="shrink-0 text-[#6f6b62]" />
      <input ref={inputRef} type="text" value={searchValue} onChange={(event) => { setSearchValue(event.target.value); setHasSearched(false); setError(null) }} onKeyDown={(event) => { if (event.key === "Enter") void handleSubmit(); if (event.key === "Escape") onOpenChange(false) }} aria-label="Search artworks" placeholder="Search artworks" className="min-w-0 flex-1 bg-transparent text-xs text-[#0f1524] outline-none placeholder:text-[#8d887e]" disabled={isLoading} />
      {isLoading && <Loader2 size={16} className="shrink-0 animate-spin text-[#6f6b62]" />}
      {!isLoading && searchValue && <button type="button" onClick={hasSearched ? handleClear : () => void handleSubmit()} aria-label={hasSearched ? "Clear artwork search" : "Submit artwork search"} className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-[#6f6b62] hover:bg-white hover:text-[#0f1524]">{hasSearched ? <><X size={15} /><span>Clear</span></> : <><Check size={15} /><span>Search</span></>}</button>}
      <button type="button" onClick={() => onOpenChange(false)} aria-label="Close artwork search" className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-[#6f6b62] hover:bg-white hover:text-[#0f1524]"><X size={15} /><span>Close</span></button>
      {error && <span className="sr-only" role="alert">{error}</span>}
    </div> : <button type="button" onClick={() => onOpenChange(true)} aria-label={activeQuery ? `Search results for ${activeQuery}` : "Open artwork search"} title={activeQuery ? `Search results for “${activeQuery}”` : "Search artworks"} className="flex h-[30px] min-w-0 items-center gap-2 whitespace-nowrap rounded-[12px] bg-[#f5f3ed] px-3 text-xs font-medium text-[#3c3931] transition-colors hover:bg-[#efece4]"><Search size={15} className="shrink-0" /><span className="max-w-[160px] truncate">{activeQuery || "Search"}</span></button>}
  </div>
}
