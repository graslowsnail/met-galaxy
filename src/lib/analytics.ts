import posthog from 'posthog-js'

export type ArtworkOpenSource =
  | 'main_grid'
  | 'search_results'
  | 'most_liked'
  | 'similarity_field'
  | 'breadcrumb'
  | 'shared_link'
  | 'browser_history'

type AnalyticsEvents = {
  artwork_opened: {
    artwork_id: number
    title: string | null
    artist: string | null
    department?: string | null
    source: ArtworkOpenSource
    depth: number
  }
  similarity_exited: { depth_reached: number }
  search_performed: {
    query: string
    query_length: number
    result_count: number
    has_timeline_filter: boolean
  }
  search_paginated: { query: string; page_size: number; total_loaded: number }
  search_cleared: { query: string }
  timeline_filter_changed: {
    from_year: number | null
    to_year: number | null
    cleared: boolean
    had_search: boolean
  }
  artwork_like_toggled: { artwork_id: number; liked: boolean; like_count: number }
  path_shared: { artwork_id: number; depth: number }
  shared_path_opened: { artwork_id: number; depth: number }
}

export function track<K extends keyof AnalyticsEvents>(
  event: K,
  properties: AnalyticsEvents[K],
) {
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}
