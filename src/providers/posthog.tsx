'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { env } from '@/config/env'
import { beforeSend } from '@/lib/error-filtering'
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
      // Drops stackless browser-extension messaging errors that reach us only
      // because they surface on `window`; see lib/error-filtering.ts.
      before_send: beforeSend,
      session_recording: {
        maskAllInputs: false,
        maskTextSelector: undefined,
      },
    })

    posthog.identify(getVoterId())
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
