'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { env } from '@/config/env'
import { getVoterId } from '@/lib/likes'

export function PostHogProviderClient({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if (typeof window === 'undefined' || !env.NEXT_PUBLIC_POSTHOG_KEY) return

    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2026-05-30',
      person_profiles: 'always',
      // Covers client-side moves between the /art/[id] landing pages. It does
      // NOT cover the explorer, where every screen is "/" behind ?path= query
      // params — PostHog only fires on *pathname* changes. That half is tracked
      // with explicit events instead; see lib/analytics.ts.
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
      capture_exceptions: true,
      session_recording: {
        maskAllInputs: false,
        maskTextSelector: undefined,
      },
      loaded: (client) => client.identify(getVoterId()),
    })
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
